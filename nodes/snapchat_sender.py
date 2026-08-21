import os
import sys
import json
import base64
import asyncio
import io
import time
import subprocess
import torch
import numpy as np
from PIL import Image

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
            # Quick check if chromium executable is available
            browser_type = p.chromium
            executable = browser_type.executable_path
            if not os.path.exists(executable):
                raise FileNotFoundError("Chromium not found")
    except Exception:
        print("[LeafFlow] Installing Playwright Chromium browser binary...")
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])


def tensor_to_base64_png(image_tensor):
    """Convert a ComfyUI image tensor [B, H, W, C] to a base64 encoded PNG data URI."""
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
    
    // Draw initial blank black frame
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, 1080, 1920);

    window.__updateVirtualCameraImage = function(base64DataUrl) {
        window.__snapchat_virtual_image = base64DataUrl;
        const img = new Image();
        img.onload = function() {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 1080, 1920);
            
            // Aspect-fit scale centered inside 1080x1920 vertical canvas
            const scale = Math.min(1080 / img.width, 1920 / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const drawX = (1080 - drawW) / 2;
            const drawY = (1920 - drawH) / 2;
            
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
        };
        img.src = base64DataUrl;
    };

    // Override navigator.mediaDevices.getUserMedia to pipe our 1080x1920 canvas video stream
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
    caption: str = "",
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
                    # Fill username / email
                    userInput = page.locator("input[name='accountIdentifier'], input[id='accountIdentifier'], input[type='text']").first
                    if await userInput.is_visible(timeout=5000):
                        await userInput.fill(username)
                        await page.wait_for_timeout(500)
                        
                        next_btn = page.locator("button[type='submit'], button:has-text('Next'), button:has-text('Log in')").first
                        if await next_btn.is_visible():
                            await next_btn.click()
                            await page.wait_for_timeout(2000)

                    # Fill password
                    passInput = page.locator("input[name='password'], input[type='password'], input[id='password']").first
                    if await passInput.is_visible(timeout=5000):
                        await passInput.fill(password)
                        await page.wait_for_timeout(500)
                        
                        submit_btn = page.locator("button[type='submit'], button:has-text('Next'), button:has-text('Log in')").first
                        if await submit_btn.is_visible():
                            await submit_btn.click()
                            await page.wait_for_timeout(3000)

                    # Wait for login completion / 2FA approval
                    log("Waiting for authentication approval / dashboard redirect...")
                    for _ in range(int(timeout / 2)):
                        if "web.snapchat.com" in page.url and "accounts.snapchat.com" not in page.url:
                            log("Login successful!")
                            break
                        await page.wait_for_timeout(2000)
                else:
                    return False, "Not logged in to Snapchat. Please run 'python snapchat_login.py' once to authenticate with Google, or provide username & password in the node."

            # Inject the ComfyUI image into the virtual camera feed
            log("Injecting ComfyUI image to virtual camera...")
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
                # Fallback: Search for large circular capture button in main view
                fallback_shutter = page.locator("button:has(svg), div[role='button']").filter(has_text="").first
                if await fallback_shutter.is_visible():
                    await fallback_shutter.click()
                    shutter_clicked = True
                    log("Shutter clicked via fallback locator.")

            await page.wait_for_timeout(2000)

            # Add optional caption if requested
            if caption:
                log(f"Adding caption text: '{caption}'...")
                caption_area = page.locator("div[contenteditable='true'], textarea[placeholder*='caption'], input[placeholder*='caption']").first
                if await caption_area.is_visible(timeout=2000):
                    await caption_area.fill(caption)
                    await page.wait_for_timeout(500)

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
                # Fallback: check first result item checkbox
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
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "send_to": ("STRING", {"default": "", "multiline": False, "placeholder": "Recipient Snapchat username"}),
            },
            "optional": {
                "caption": ("STRING", {"default": "", "multiline": True, "placeholder": "Optional snap text overlay"}),
                "username": ("STRING", {"default": "", "multiline": False, "placeholder": "Your Snapchat username / email"}),
                "password": ("STRING", {"default": "", "multiline": False, "placeholder": "Your Snapchat password"}),
                "headless": ("BOOLEAN", {"default": True, "tooltip": "Set to false on first login if 2FA verification is required."}),
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

        b64_image = tensor_to_base64_png(image)

        # Run async Playwright automation worker
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success, message = loop.run_until_complete(
                send_snapchat_camera_snap_async(
                    base64_image=b64_image,
                    send_to=clean_send_to,
                    caption=clean_caption,
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
