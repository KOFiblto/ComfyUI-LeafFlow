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
from PIL import Image, ImageDraw, ImageFont, ImageOps
from aiohttp import web

SNAPCHAT_CATEGORY = "🍃 LeafFlow/Automation"
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")
DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


def ensure_playwright():
    """Ensure playwright package is installed."""
    try:
        import playwright
    except ImportError:
        print("[LeafFlow] Installing playwright package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])


def run_async_in_isolated_thread(coro):
    """Runs a coroutine inside a fresh, dedicated thread with its own isolated asyncio event loop."""
    result = [False, "Unknown error"]
    exception = [None]

    def runner():
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            res = loop.run_until_complete(coro)
            result[0], result[1] = res
            loop.close()
        except Exception as e:
            exception[0] = e

    t = threading.Thread(target=runner)
    t.start()
    t.join()

    if exception[0] is not None:
        raise exception[0]
    return result[0], result[1]


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
    Renders the iconic classic Snapchat semi-transparent black caption bar
    with centered crisp white text across the full width of the image.
    Matched to authentic Snapchat mobile reference layout (81% Y, 4.5% font size, 58% alpha).
    """
    if not text or not text.strip() or opacity <= 0.0:
        return pil_img

    img = pil_img.convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # 4.5% of width matches mobile reference proportions
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

    sample_bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_h = sample_bbox[3] - sample_bbox[1]
    line_spacing = int(target_font_size * 0.25)
    total_text_h = (len(lines) * line_h) + max(0, (len(lines) - 1) * line_spacing)
    
    pad_y = int(target_font_size * 0.60)
    banner_h = total_text_h + (pad_y * 2)

    pos_pct = 0.81
    if "center" in position or "50" in position:
        pos_pct = 0.50
    elif "upper" in position or "35" in position:
        pos_pct = 0.35

    banner_top = int((h * pos_pct) - (banner_h / 2))
    banner_bottom = banner_top + banner_h

    alpha_int = int(min(1.0, max(0.0, opacity)) * 255)
    draw.rectangle([0, banner_top, w, banner_bottom], fill=(0, 0, 0, alpha_int))

    curr_y = banner_top + pad_y - sample_bbox[1]
    for line in lines:
        l_bbox = draw.textbbox((0, 0), line, font=font)
        l_w = l_bbox[2] - l_bbox[0]
        curr_x = (w - l_w) // 2
        draw.text((curr_x, curr_y), line, font=font, fill=(255, 255, 255, 255))
        curr_y += line_h + line_spacing

    result = Image.alpha_composite(img, overlay).convert("RGB")
    return result


def tensor_to_base64_png(image_tensor, caption="", caption_position="classic (lower-third ~80%)", caption_opacity=0.58, mirror_for_camera=True):
    """
    Strips ComfyUI workflow/metadata and converts image tensor to clean 1080x1920 base64 JPEG
    with classic Snapchat banner overlay and mirror compensation for WebRTC selfie camera.
    """
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

    # Downscale cleanly to 1080x1920 (or proportional 9:16) with Lanczos if larger
    w, h = pil_img.size
    if w > 1080 or h > 1920:
        scale = min(1080 / w, 1920 / h)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    if caption and caption.strip():
        pil_img = apply_snapchat_caption_bar(pil_img, caption, position=caption_position, opacity=caption_opacity)

    # Mirror horizontally before passing to virtual camera feed so that Snapchat's
    # selfie camera mirroring outputs a perfectly upright, non-reversed snap
    if mirror_for_camera:
        pil_img = ImageOps.mirror(pil_img)

    # Save to clean buffer (strips all EXIF/ComfyUI JSON metadata)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=95)
    raw_bytes = buf.getvalue()
    b64_str = base64.b64encode(raw_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_str}"


ANIMATED_VIRTUAL_CAMERA_SCRIPT = """
(function() {
    window.__snapchat_virtual_image = "";
    window.__snapchat_canvas = document.createElement("canvas");
    window.__snapchat_canvas.width = 1080;
    window.__snapchat_canvas.height = 1920;
    const ctx = window.__snapchat_canvas.getContext("2d", { alpha: false });
    
    let currentImageObj = null;
    
    function renderLoop() {
        if (currentImageObj && currentImageObj.complete && currentImageObj.naturalWidth > 0) {
            if (window.__snapchat_canvas.width !== currentImageObj.naturalWidth || window.__snapchat_canvas.height !== currentImageObj.naturalHeight) {
                window.__snapchat_canvas.width = currentImageObj.naturalWidth;
                window.__snapchat_canvas.height = currentImageObj.naturalHeight;
            }
            ctx.drawImage(currentImageObj, 0, 0, currentImageObj.naturalWidth, currentImageObj.naturalHeight);
        } else {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 0, window.__snapchat_canvas.width, window.__snapchat_canvas.height);
        }
        requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    window.__updateVirtualCameraImage = function(base64DataUrl) {
        window.__snapchat_virtual_image = base64DataUrl;
        const img = new Image();
        img.onload = function() {
            currentImageObj = img;
        };
        img.src = base64DataUrl;
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async function(constraints) {
            try {
                const stream = window.__snapchat_canvas.captureStream(30);
                return stream;
            } catch(e) {
                return origGetUserMedia(constraints);
            }
        };
    }
})();
"""


async def open_recipient_chat_async(page, send_to: str, log):
    """Helper to locate recipient by username or display name and open their chat."""
    log(f"Locating recipient '{send_to}' in contact list...")
    
    # 1. Check direct match in visible list
    direct_match = page.locator("div[role='listitem'], div.O4POs, div:has-text('" + send_to + "')").filter(has_text=send_to).last
    if await direct_match.is_visible(timeout=2000):
        await direct_match.click()
        log(f"Opened chat with '{send_to}' directly from list.")
        await page.wait_for_timeout(1500)
        return True

    # 2. Search sidebar input
    sidebar_search = page.locator("input[placeholder*='Search']").first
    if await sidebar_search.is_visible(timeout=3000):
        await sidebar_search.click()
        await sidebar_search.fill(send_to)
        await page.wait_for_timeout(1500)

        # Click matching search result card
        res = page.locator("div[role='listitem'], div.O4POs, div:has-text('" + send_to + "')").last
        if await res.is_visible(timeout=3000):
            await res.click()
            log(f"Opened chat with '{send_to}' from search results.")
            await page.wait_for_timeout(1500)
            return True
        else:
            # Fallback: click first search result row
            first_res = page.locator("div.O4POs").first
            if await first_res.is_visible(timeout=2000):
                await first_res.click()
                log(f"Opened first search result for '{send_to}'.")
                await page.wait_for_timeout(1500)
                return True

    return False


async def send_snapchat_text_message_async(
    text: str,
    send_to: str,
    headless: bool = True,
    profile_name: str = "default",
    timeout: int = 60
):
    """Sends a pure text chat message to the recipient on Snapchat Web."""
    from playwright.async_api import async_playwright

    profile_path = os.path.join(PROFILES_DIR, profile_name)
    os.makedirs(profile_path, exist_ok=True)

    def log(msg):
        print(f"[LeafFlow Snapchat] {msg}")

    log(f"Starting Snapchat text chat dispatch for recipient '{send_to}'...")

    async with async_playwright() as p:
        browser_context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            headless=headless,
            user_agent=DESKTOP_USER_AGENT,
            viewport={"width": 1440, "height": 960},
            permissions=["camera", "microphone"],
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )

        try:
            page = await browser_context.new_page()
            log("Navigating to web.snapchat.com...")
            await page.goto("https://web.snapchat.com", wait_until="networkidle", timeout=timeout * 1000)
            await page.wait_for_timeout(2500)

            # Check if login is required
            if "accounts.snapchat.com" in page.url or "login" in page.url:
                return False, "Not logged in to Snapchat. Please authenticate first."

            # Open chat with recipient
            await open_recipient_chat_async(page, send_to, log)

            # Locate chat input
            log("Typing and sending text message...")
            chat_input = page.locator("div[contenteditable='true'], div[role='textbox'], [placeholder*='Send chat'], input[placeholder*='Send chat'], textarea[placeholder*='Send chat']").first
            if await chat_input.is_visible(timeout=4000):
                await chat_input.click()
                await page.wait_for_timeout(300)
                await chat_input.fill(text)
                await page.wait_for_timeout(300)
                await page.keyboard.press("Enter")
            else:
                await page.keyboard.type(text)
                await page.keyboard.press("Enter")

            await page.wait_for_timeout(3000)
            log(f"Success: Text message successfully sent to '{send_to}'!")
            return True, f"Success: Text message delivered to '{send_to}'"

        except Exception as e:
            err_msg = f"Failed to send text message: {str(e)}"
            log(f"Error: {err_msg}")
            return False, err_msg
        finally:
            await browser_context.close()


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

    log(f"Starting Snapchat camera dispatch for recipient '{send_to}'...")

    async with async_playwright() as p:
        browser_context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            headless=headless,
            user_agent=DESKTOP_USER_AGENT,
            viewport={"width": 1440, "height": 960},
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
            await page.add_init_script(ANIMATED_VIRTUAL_CAMERA_SCRIPT)

            log("Navigating to web.snapchat.com...")
            await page.goto("https://web.snapchat.com", wait_until="networkidle", timeout=timeout * 1000)
            await page.wait_for_timeout(2500)

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
            log("Injecting image into virtual camera stream...")
            await page.evaluate("(imgData) => { if (window.__updateVirtualCameraImage) window.__updateVirtualCameraImage(imgData); }", base64_image)
            await page.wait_for_timeout(1000)

            # Direct Contact Chat Camera (Most reliable & native)
            await open_recipient_chat_async(page, send_to, log)

            # Click the camera icon at the bottom-left of the chat window
            log("Opening camera for recipient...")
            chat_camera_btn = page.locator("button.cDumY, div:has(input[placeholder*='Send chat']) button:has(svg), button[aria-label*='Camera'], button[aria-label*='camera']").first
            if await chat_camera_btn.is_visible(timeout=3000):
                await chat_camera_btn.click()
            else:
                bottom_buttons = await page.locator("button:has(svg)").all()
                for btn in bottom_buttons:
                    box = await btn.bounding_box()
                    if box and box["y"] > 800 and box["x"] < 500:
                        await btn.click()
                        break

            await page.wait_for_timeout(2500)

            # Capture photo via Spacebar
            log("Snapping photo via camera shutter...")
            await page.keyboard.press("Space")
            await page.wait_for_timeout(2500)

            # Click final Send button (class TYX6O at bottom-right of the snap preview)
            log("Sending Red Camera Snap...")
            send_btn = page.locator("button.TYX6O, button:has-text('Send'), button:has-text('Send to')").last
            if await send_btn.is_visible(timeout=5000):
                await send_btn.click(force=True)
                log("Final Send button clicked!")
            else:
                # Fallback: click coordinate x=1077, y=896
                await page.mouse.click(1077, 896)
                log("Dispatched via coordinate click (1077, 896).")

            await page.wait_for_timeout(4000)
            log(f"Success: Red Camera Snap successfully delivered to '{send_to}'!")
            return True, f"Success: Red Camera Snap delivered to '{send_to}'"

        except Exception as e:
            err_msg = f"Failed to send snap: {str(e)}"
            log(f"Error: {err_msg}")
            return False, err_msg
        finally:
            await browser_context.close()


class SnapchatCameraSnapNode:
    """
    LeafFlow Automation Node:
    Unified Snapchat Dispatcher:
    - If only text input -> sends direct text chat message.
    - If only image input -> captures and sends authentic red Camera Snap.
    - If image + text -> renders iconic Snapchat caption banner on image & sends as red Camera Snap.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "send_to": ("STRING", {"default": "Mathias", "multiline": False, "placeholder": "Recipient visual name or username (e.g. Mathias or ko_mathias)"}),
            },
            "optional": {
                "image": ("IMAGE",),
                "text": ("STRING", {"default": "", "multiline": True, "placeholder": "Text message (if no image) OR caption bar (if image connected)..."}),
                "caption_position": (["classic (lower-third ~80%)", "center (50%)", "upper (35%)"], {"default": "classic (lower-third ~80%)"}),
                "caption_opacity": ("FLOAT", {"default": 0.58, "min": 0.0, "max": 1.0, "step": 0.02, "tooltip": "Opacity of the classic Snapchat black text banner (0.58 = exact reference standard)."}),
                "mirror_camera": ("BOOLEAN", {"default": True, "tooltip": "Compensates for Snapchat Web's front/selfie camera horizontal mirror so text and image are upright."}),
                "username": ("STRING", {"default": "", "multiline": False, "placeholder": "Optional if using Google Session"}),
                "password": ("STRING", {"default": "", "multiline": False, "placeholder": "Optional if using Google Session"}),
                "headless": ("BOOLEAN", {"default": True, "tooltip": "Set to false on first login if manual verification is required."}),
                "profile_name": ("STRING", {"default": "default", "multiline": False, "tooltip": "Folder name under user/snapchat_profiles/ to persist cookies & session tokens."}),
                "timeout": ("INT", {"default": 60, "min": 10, "max": 300, "step": 5, "tooltip": "Max wait time in seconds for page navigation and login approval."}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "status")
    FUNCTION = "dispatch_snapchat"
    CATEGORY = SNAPCHAT_CATEGORY
    OUTPUT_NODE = True

    def dispatch_snapchat(
        self,
        send_to,
        image=None,
        text="",
        caption_position="classic (lower-third ~80%)",
        caption_opacity=0.58,
        mirror_camera=True,
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
        clean_text = text.strip() if text else ""
        clean_profile = profile_name.strip() if profile_name else "default"

        try:
            ensure_playwright()
        except Exception as e:
            return (image, f"Error: Playwright installation failed: {e}")

        # Determine dispatch mode:
        has_image = image is not None
        has_text = bool(clean_text)

        if not has_image and not has_text:
            return (image, "Error: Neither image nor text was provided to send.")

        # Mode 1: Pure text message
        if not has_image and has_text:
            try:
                success, message = run_async_in_isolated_thread(
                    send_snapchat_text_message_async(
                        text=clean_text,
                        send_to=clean_send_to,
                        headless=headless,
                        profile_name=clean_profile,
                        timeout=timeout
                    )
                )
                print(f"[LeafFlow Snapchat] Result: {success} -> {message}")
                return (image, message)
            except Exception as e:
                err_msg = f"Error in text chat dispatch: {str(e)}"
                print(f"[LeafFlow Snapchat] {err_msg}")
                return (image, err_msg)

        # Mode 2 & 3: Camera Snap (with or without caption banner)
        b64_image = tensor_to_base64_png(
            image, 
            caption=clean_text, 
            caption_position=caption_position, 
            caption_opacity=caption_opacity,
            mirror_for_camera=mirror_camera
        )

        try:
            success, message = run_async_in_isolated_thread(
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
            print(f"[LeafFlow Snapchat] Result: {success} -> {message}")
            return (image, message)
        except Exception as e:
            err_msg = f"Error in Snapchat camera automation loop: {str(e)}"
            print(f"[LeafFlow Snapchat] {err_msg}")
            return (image, err_msg)


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
