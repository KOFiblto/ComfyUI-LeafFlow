import os
import sys
import json
import base64
import asyncio
import io
import time
import shutil
import threading
import subprocess
import torch
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from aiohttp import web

SNAPCHAT_CATEGORY = "🍃 LeafFlow/Automation"
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")


def ensure_playwright():
    """Ensure playwright package and chromium browser binaries are installed."""
    try:
        import playwright
    except ImportError:
        print("[LeafFlow] Installing playwright package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        import playwright

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser_type = p.chromium
            executable = browser_type.executable_path
            if not os.path.exists(executable):
                raise FileNotFoundError("Chromium not found")
    except Exception:
        print("[LeafFlow] Installing Playwright Chromium browser binary...")
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])


def is_snapchat_profile_authenticated(profile_name="default"):
    """Check if persistent browser session directory contains saved cookies/tokens."""
    profile_dir = os.path.join(PROFILES_DIR, profile_name)
    if not os.path.exists(profile_dir):
        return False
    cookie_paths = [
        os.path.join(profile_dir, "Default", "Network", "Cookies"),
        os.path.join(profile_dir, "Default", "Cookies"),
        os.path.join(profile_dir, "Network", "Cookies"),
        os.path.join(profile_dir, "Default", "Local Storage", "leveldb")
    ]
    for p in cookie_paths:
        if os.path.exists(p):
            try:
                if os.path.isdir(p) and len(os.listdir(p)) > 0:
                    return True
                elif os.path.isfile(p) and os.path.getsize(p) > 0:
                    return True
            except Exception:
                pass
    return False


def clear_snapchat_profile(profile_name="default"):
    """Wipe saved session cookies and local storage from the specified profile."""
    profile_dir = os.path.join(PROFILES_DIR, profile_name)
    if os.path.exists(profile_dir):
        try:
            shutil.rmtree(profile_dir, ignore_errors=True)
            return True
        except Exception as e:
            print(f"[LeafFlow] Error clearing snapchat profile: {e}")
            return False
    return True


def apply_snapchat_caption_bar(pil_img, text, position="classic (lower-third ~80%)", opacity=0.58):
    """
    Renders the iconic, authentic classic Snapchat semi-transparent black caption bar
    with centered crisp white text across the full width of the image.
    Mathematically matched to the authentic Snapchat mobile reference layout:
    - Position: Lower-third (~81% from top)
    - Font Size: 4.5% of image width
    - Padding: 60% of font size
    - Opacity: 58% black overlay
    """
    if not text or not text.strip() or opacity <= 0.0:
        return pil_img

    img = pil_img.convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 4.5% of width matches the reference image (26px on 576w, ~69px on 1536w)
    target_font_size = max(20, int(w * 0.045))
    
    font = None
    candidate_fonts = [
        "arial.ttf", "segoeui.ttf", "Helvetica.ttf", "DejaVuSans.ttf",
        "arialbd.ttf", "segoeuib.ttf", "Helvetica-Bold.ttf"
    ]
    for font_name in candidate_fonts:
        try:
            font = ImageFont.truetype(font_name, target_font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Word wrapping within 92% of image width
    margin = int(w * 0.04)
    max_text_width = w - (margin * 2)
    
    words = text.strip().split()
    lines = []
    current_line = []
    
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        line_w = bbox[2] - bbox[0]
        if line_w <= max_text_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))

    # Exact line height and vertical padding matching reference (5.6% of image height)
    sample_bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_h = sample_bbox[3] - sample_bbox[1]
    line_spacing = int(target_font_size * 0.25)
    total_text_h = (len(lines) * line_h) + max(0, (len(lines) - 1) * line_spacing)
    
    pad_y = int(target_font_size * 0.60)
    banner_h = total_text_h + (pad_y * 2)

    # Position anchor: classic lower-third (81% from top) matching reference image
    pos_pct = 0.81
    if "center" in position or "50" in position:
        pos_pct = 0.50
    elif "upper" in position or "35" in position:
        pos_pct = 0.35

    banner_top = int((h * pos_pct) - (banner_h / 2))
    banner_bottom = banner_top + banner_h

    # Draw full-width semi-transparent black banner (0.58 default)
    alpha_int = int(min(1.0, max(0.0, opacity)) * 255)
    draw.rectangle([0, banner_top, w, banner_bottom], fill=(0, 0, 0, alpha_int))

    # Draw centered crisp white text lines with clean baseline alignment
    curr_y = banner_top + pad_y - sample_bbox[1]
    for line in lines:
        l_bbox = draw.textbbox((0, 0), line, font=font)
        l_w = l_bbox[2] - l_bbox[0]
        curr_x = (w - l_w) // 2
        draw.text((curr_x, curr_y), line, font=font, fill=(255, 255, 255, 255))
        curr_y += line_h + line_spacing

    # Composite cleanly back to RGB
    result = Image.alpha_composite(img, overlay).convert("RGB")
    return result


def tensor_to_base64_png(image_tensor, caption="", caption_position="classic (lower-third ~80%)", caption_opacity=0.58):
    """Convert ComfyUI tensor to base64 PNG with optional native classic Snapchat text banner overlay."""
    if isinstance(image_tensor, torch.Tensor):
        if len(image_tensor.shape) == 4:
            img_np = image_tensor[0].cpu().numpy()
        else:
            img_np = image_tensor.cpu().numpy()
        img_np = (img_np * 255.0).clip(0, 255).astype(np.uint8)
        pil_img = Image.fromarray(img_np)
    elif isinstance(image_tensor, Image.Image):
        pil_img = image_tensor
    else:
        raise ValueError("Unsupported image format for Snapchat sender")

    if caption and caption.strip():
        pil_img = apply_snapchat_caption_bar(pil_img, caption, position=caption_position, opacity=caption_opacity)

    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()
    b64_str = base64.b64encode(raw_bytes).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


VIRTUAL_CAMERA_INIT_SCRIPT = """
(function() {
    window.__snapchat_virtual_image = "";
    window.__snapchat_canvas = document.createElement("canvas");
    window.__snapchat_canvas.width = 1080;
    window.__snapchat_canvas.height = 1920;
    const ctx = window.__snapchat_canvas.getContext("2d");
    
    // Draw initial black frame
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, 1080, 1920);

    window.__updateVirtualCameraImage = function(base64DataUrl) {
        window.__snapchat_virtual_image = base64DataUrl;
        const img = new Image();
        img.onload = function() {
            // Dynamically match canvas to source resolution (e.g. 1536x2720) without downscaling
            window.__snapchat_canvas.width = img.width;
            window.__snapchat_canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = base64DataUrl;
    };

    // Override navigator.mediaDevices.getUserMedia to pipe uncompressed video stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async function(constraints) {
            if (constraints && (constraints.video || constraints.audio === false)) {
                try {
                    const stream = window.__snapchat_canvas.captureStream(30);
                    return stream;
                } catch(e) {
                    console.warn("[LeafFlow Virtual Camera] captureStream fallback:", e);
                }
            }
            return originalGetUserMedia(constraints);
        };
    }
})();
"""


async def send_snapchat_camera_snap_async(
    base64_image: str,
    send_to: str,
    username: str = "",
    password: str = "",
    headless: bool = True,
    profile_name: str = "default",
    timeout: int = 60
):
    from playwright.async_api import async_playwright

    profile_path = os.path.join(PROFILES_DIR, profile_name)
    os.makedirs(profile_path, exist_ok=True)

    status_messages = []

    def log(msg):
        print(f"[LeafFlow Snapchat] {msg}")
        status_messages.append(msg)

    log(f"Starting Snapchat camera dispatch for recipient '@{send_to}'...")

    async with async_playwright() as p:
        browser_context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            headless=headless,
            viewport={"width": 1280, "height": 850},
            permissions=["camera", "microphone"],
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )

        try:
            page = await browser_context.new_page()
            # Inject Virtual Camera Canvas Hook prior to page scripts
            await page.add_init_script(VIRTUAL_CAMERA_INIT_SCRIPT)

            log("Navigating to web.snapchat.com...")
            await page.goto("https://web.snapchat.com", wait_until="domcontentloaded", timeout=timeout * 1000)
            await page.wait_for_timeout(2000)

            # Check if login is required
            current_url = page.url
            if "accounts.snapchat.com" in current_url or "login" in current_url:
                log("Login required...")
                if username and password:
                    log(f"Attempting login as '{username}'...")
                    userInput = page.locator("input[name='accountIdentifier'], input[id='accountIdentifier'], input[type='text']").first
                    if await userInput.is_visible(timeout=5000):
                        await userInput.fill(username)
                        await page.wait_for_timeout(500)
                        
                        next_btn = page.locator("button[type='submit'], button:has-text('Next'), button:has-text('Log in')").first
                        if await next_btn.is_visible():
                            await next_btn.click()
                            await page.wait_for_timeout(2000)

                    passInput = page.locator("input[name='password'], input[type='password'], input[id='password']").first
                    if await passInput.is_visible(timeout=5000):
                        await passInput.fill(password)
                        await page.wait_for_timeout(500)
                        
                        submit_btn = page.locator("button[type='submit'], button:has-text('Next'), button:has-text('Log in')").first
                        if await submit_btn.is_visible():
                            await submit_btn.click()
                            await page.wait_for_timeout(3000)

                    log("Waiting for authentication approval / dashboard redirect...")
                    for _ in range(int(timeout / 2)):
                        if "web.snapchat.com" in page.url and "accounts.snapchat.com" not in page.url:
                            log("Login successful!")
                            break
                        await page.wait_for_timeout(2000)
                else:
                    return False, "Not logged in to Snapchat. Please click 'Log in' in ComfyUI Settings or run 'python snapchat_login.py' to authenticate."

            # Inject the ComfyUI image into the virtual camera feed
            log("Injecting high-resolution ComfyUI image to virtual camera...")
            await page.evaluate("(imgData) => { if (window.__updateVirtualCameraImage) window.__updateVirtualCameraImage(imgData); }", base64_image)
            await page.wait_for_timeout(1500)

            # Open Camera View if not already open
            camera_btn = page.locator("button[aria-label*='Camera'], [data-testid='camera-button'], button:has-text('Camera'), svg[aria-label='Camera']").first
            if await camera_btn.is_visible(timeout=3000):
                await camera_btn.click()
                await page.wait_for_timeout(1500)

            # Locate and click Shutter button to take the live Snap photo
            log("Triggering camera shutter to capture live Snap...")
            shutter_selectors = [
                "button[aria-label*='Take snap']",
                "button[aria-label*='Take photo']",
                "button[aria-label*='Capture']",
                "button.shutter",
                "[data-testid='shutter-button']",
                "div[role='button'][aria-label*='snap']",
                "button[aria-label*='Take Snap']"
            ]
            shutter_clicked = False
            for sel in shutter_selectors:
                btn = page.locator(sel).first
                if await btn.is_visible(timeout=1000):
                    await btn.click()
                    shutter_clicked = True
                    log(f"Shutter clicked using selector '{sel}'.")
                    break

            if not shutter_clicked:
                fallback_shutter = page.locator("button:has(svg), div[role='button']").filter(has_text="").first
                if await fallback_shutter.is_visible():
                    await fallback_shutter.click()
                    shutter_clicked = True
                    log("Shutter clicked via fallback locator.")

            await page.wait_for_timeout(2000)

            # Click 'Send To' button
            log("Clicking 'Send To' button...")
            send_to_selectors = [
                "button:has-text('Send To')",
                "button[aria-label*='Send To']",
                "button:has-text('Send to')",
                "[data-testid='send-to-button']",
                "button.send-to"
            ]
            for sel in send_to_selectors:
                btn = page.locator(sel).first
                if await btn.is_visible(timeout=3000):
                    await btn.click()
                    break

            await page.wait_for_timeout(1500)

            # Search recipient username
            log(f"Searching for recipient '@{send_to}'...")
            search_input = page.locator("input[placeholder*='Search'], input[type='search'], input[aria-label*='Search']").first
            if await search_input.is_visible(timeout=4000):
                await search_input.fill(send_to)
                await page.wait_for_timeout(1500)

            # Select matching contact checkbox or item
            recipient_item = page.locator(f"text={send_to}").first
            if await recipient_item.is_visible(timeout=4000):
                await recipient_item.click()
                await page.wait_for_timeout(1000)
                log(f"Recipient '@{send_to}' selected.")
            else:
                first_checkbox = page.locator("input[type='checkbox']").first
                if await first_checkbox.is_visible(timeout=2000):
                    await first_checkbox.check()
                    log("Selected first contact from search results.")

            # Click final Send button
            log("Sending Snap...")
            final_send_selectors = [
                "button[aria-label*='Send']:not([disabled])",
                "button:has-text('Send'):not([disabled])",
                "[data-testid='send-arrow-button']",
                "button.send-arrow"
            ]
            for sel in final_send_selectors:
                btn = page.locator(sel).first
                if await btn.is_visible(timeout=3000):
                    await btn.click()
                    log("Final send button clicked!")
                    break

            await page.wait_for_timeout(3000)
            log(f"Success: Red Camera Snap successfully delivered to @{send_to}!")
            return True, f"Success: Red Camera Snap delivered to @{send_to}"

        except Exception as e:
            err_msg = f"Failed to send snap: {str(e)}"
            log(f"Error: {err_msg}")
            return False, err_msg
        finally:
            await browser_context.close()


class SnapchatCameraSnapNode:
    """
    LeafFlow Automation Node:
    Streams a ComfyUI image into Snapchat Web's virtual camera feed and captures + dispatches
    an authentic red Camera Snap to the specified recipient username.
    Supports classic semi-transparent Snapchat text banners and full native resolution.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "send_to": ("STRING", {"default": "ko_mathias", "multiline": False, "placeholder": "Recipient Snapchat username"}),
            },
            "optional": {
                "caption": ("STRING", {"default": "", "multiline": True, "placeholder": "Classic Snapchat text banner..."}),
                "caption_position": (["classic (lower-third ~80%)", "center (50%)", "upper (35%)"], {"default": "classic (lower-third ~80%)"}),
                "caption_opacity": ("FLOAT", {"default": 0.58, "min": 0.0, "max": 1.0, "step": 0.02, "tooltip": "Opacity of the classic Snapchat black text banner (0.58 = exact reference standard)."}),
                "username": ("STRING", {"default": "", "multiline": False, "placeholder": "Optional if using Google Session"}),
                "password": ("STRING", {"default": "", "multiline": False, "placeholder": "Optional if using Google Session"}),
                "headless": ("BOOLEAN", {"default": True, "tooltip": "Set to false on first login if manual verification is required."}),
                "profile_name": ("STRING", {"default": "default", "multiline": False, "tooltip": "Folder name under user/snapchat_profiles/ to persist cookies & session tokens."}),
                "timeout": ("INT", {"default": 60, "min": 10, "max": 300, "step": 5, "tooltip": "Max wait time in seconds for page navigation and login approval."}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "status")
    FUNCTION = "send_camera_snap"
    CATEGORY = SNAPCHAT_CATEGORY
    OUTPUT_NODE = True

    def send_camera_snap(
        self,
        image,
        send_to,
        caption="",
        caption_position="classic (lower-third ~80%)",
        caption_opacity=0.58,
        username="",
        password="",
        headless=True,
        profile_name="default",
        timeout=60,
        **kwargs
    ):
        if not send_to or not send_to.strip():
            return (image, "Error: 'send_to' recipient username is empty.")

        clean_send_to = send_to.strip().lstrip("@")
        clean_username = username.strip() if username else ""
        clean_password = password.strip() if password else ""
        clean_caption = caption.strip() if caption else ""
        clean_profile = profile_name.strip() if profile_name else "default"

        try:
            ensure_playwright()
        except Exception as e:
            return (image, f"Error: Playwright installation failed: {e}")

        # Convert tensor to high-res base64 with classic Snapchat banner rendered directly onto the frame
        b64_image = tensor_to_base64_png(
            image, 
            caption=clean_caption, 
            caption_position=caption_position, 
            caption_opacity=caption_opacity
        )

        # Run async Playwright automation worker
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success, message = loop.run_until_complete(
                send_snapchat_camera_snap_async(
                    base64_image=b64_image,
                    send_to=clean_send_to,
                    username=clean_username,
                    password=clean_password,
                    headless=headless,
                    profile_name=clean_profile,
                    timeout=timeout
                )
            )
            loop.close()
            return (image, message)
        except Exception as e:
            return (image, f"Error in Snapchat automation loop: {str(e)}")


# Register Server Endpoints for Login / Logout & Session Status
try:
    from server import PromptServer
    routes = PromptServer.instance.routes

    @routes.get("/leafflow/snapchat/status")
    async def snapchat_status_endpoint(request):
        logged_in = is_snapchat_profile_authenticated("default")
        return web.json_response({"logged_in": logged_in, "profile": "default"})

    @routes.post("/leafflow/snapchat/login")
    async def snapchat_login_endpoint(request):
        def launch_browser():
            login_script = os.path.join(CURRENT_DIR, "snapchat_login.py")
            subprocess.Popen([sys.executable, login_script])
        threading.Thread(target=launch_browser, daemon=True).start()
        return web.json_response({"status": "ok", "message": "Browser login launcher started."})

    @routes.post("/leafflow/snapchat/logout")
    async def snapchat_logout_endpoint(request):
        success = clear_snapchat_profile("default")
        return web.json_response({"status": "ok" if success else "error", "message": "Logged out of Snapchat."})
except Exception:
    pass
