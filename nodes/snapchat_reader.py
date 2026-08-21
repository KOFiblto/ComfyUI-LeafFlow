import os
import sys
import json
import asyncio
import threading
import subprocess
from datetime import datetime

SNAPCHAT_CATEGORY = "🍃 LeafFlow/Automation"
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")
DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

# Import helper functions from snapchat_sender
try:
    from .snapchat_sender import (
        ensure_playwright,
        open_recipient_chat_async,
        run_async_in_isolated_thread,
        set_snapchat_auth_marker,
        is_snapchat_profile_authenticated
    )
except ImportError:
    import importlib.util
    sender_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapchat_sender.py")
    spec = importlib.util.spec_from_file_location("snapchat_sender", sender_path)
    sender_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sender_mod)
    ensure_playwright = sender_mod.ensure_playwright
    open_recipient_chat_async = sender_mod.open_recipient_chat_async
    run_async_in_isolated_thread = sender_mod.run_async_in_isolated_thread
    set_snapchat_auth_marker = sender_mod.set_snapchat_auth_marker
    is_snapchat_profile_authenticated = sender_mod.is_snapchat_profile_authenticated


async def read_snapchat_messages_async(
    send_to: str,
    message_count: int = 5,
    filter_sender: str = "recipient_only",
    headless: bool = True,
    profile_name: str = "default",
    timeout: int = 60,
    debug_screenshots: bool = False
):
    """
    Reads the latest text messages from the specified Snapchat recipient's chat.
    Returns: (list_of_message_dicts, status_message)
    """
    from playwright.async_api import async_playwright

    profile_path = os.path.join(PROFILES_DIR, profile_name)
    os.makedirs(profile_path, exist_ok=True)

    debug_dir = None
    if debug_screenshots:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        debug_dir = os.path.join(profile_path, "debug_screenshots", f"read_{ts}")
        os.makedirs(debug_dir, exist_ok=True)

    def log(msg):
        print(f"[LeafFlow Snapchat Read] {msg}")

    async def save_shot(page, name):
        if debug_dir:
            path = os.path.join(debug_dir, f"{name}.png")
            try:
                await page.screenshot(path=path)
                log(f"Debug screenshot saved: {path}")
            except Exception:
                pass

    log(f"Reading messages from '{send_to}' (count={message_count}, filter={filter_sender})...")

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
            await save_shot(page, "01_inbox")

            # Check if login is required
            if "accounts.snapchat.com" in page.url or "login" in page.url:
                set_snapchat_auth_marker(profile_name, False)
                await save_shot(page, "02_login_required")
                return [], "Not logged in to Snapchat. Please authenticate first."
            else:
                set_snapchat_auth_marker(profile_name, True)

            # Open chat with recipient
            opened = await open_recipient_chat_async(page, send_to, log)
            if not opened:
                return [], f"Failed to locate and open chat with '{send_to}'."

            await page.wait_for_timeout(2000)
            await save_shot(page, "02_chat_open")

            # Extract chat messages from the conversation view
            extracted_items = await page.evaluate("""(targetName) => {
                // Find chat container in right pane
                const rightPane = Array.from(document.querySelectorAll('div'))
                    .filter(el => {
                        const rect = el.getBoundingClientRect();
                        return rect.x > 340 && rect.width > 300 && rect.height > 400;
                    });

                if (rightPane.length === 0) return [];

                // Traverse and parse chat lines
                const mainText = rightPane[0].innerText || '';
                const rawLines = mainText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);

                const messages = [];
                let currentSender = 'RECIPIENT';

                const ignoredExact = [
                    'YOU ARE USING SNAPCHAT',
                    'Drag and drop to upload',
                    'Send chat',
                    'Send a chat',
                    'Call',
                    'Delivered',
                    'Opened',
                    'Received',
                    'Pending',
                    'Tap to view',
                    'New Snap'
                ];

                const timeRegex = /^\\d{1,2}:\\d{2}$/;
                const dateRegex = /^\\d{1,2}\\s+[A-Z]+$/i;

                for (let i = 0; i < rawLines.length; i++) {
                    const line = rawLines[i];

                    // Date headers
                    if (dateRegex.test(line)) continue;

                    // System notices
                    if (line.includes('SNAPSTREAK') || line.includes('DELETED A CHAT') || line.includes('JOINED SNAPCHAT')) continue;

                    // Sender headers
                    if (line.toUpperCase() === 'ME') {
                        currentSender = 'ME';
                        continue;
                    }
                    
                    if (line.toUpperCase() === targetName.toUpperCase() || line.toLowerCase() === targetName.toLowerCase()) {
                        currentSender = targetName;
                        continue;
                    }

                    // Check all uppercase sender header
                    if (line.length > 0 && line.length <= 25 && line === line.toUpperCase() && !timeRegex.test(line) && !ignoredExact.includes(line)) {
                        currentSender = line;
                        continue;
                    }

                    // Ignore timestamps
                    if (timeRegex.test(line)) continue;

                    // Ignore exact status badges
                    if (ignoredExact.includes(line)) continue;

                    // Valid text message
                    messages.push({
                        sender: currentSender,
                        text: line
                    });
                }

                return messages;
            }""", send_to)

            await save_shot(page, "03_extracted")

            # Filter messages by sender
            filtered = []
            for item in extracted_items:
                sender = item.get("sender", "")
                text = item.get("text", "")
                if filter_sender == "recipient_only":
                    if sender == "ME":
                        continue
                elif filter_sender == "me_only":
                    if sender != "ME":
                        continue
                filtered.append(item)

            # Take the latest N messages
            selected = filtered[-message_count:] if message_count > 0 else filtered

            log(f"Successfully read {len(selected)} messages from '{send_to}'.")
            return selected, "Success"

        except Exception as e:
            err_msg = f"Failed to read messages: {str(e)}"
            log(f"Error: {err_msg}")
            return [], err_msg
        finally:
            await browser_context.close()


class LeafFlowSnapchatReadMessage:
    """
    LeafFlow Automation Node:
    Reads the latest text messages from a Snapchat contact (e.g. ko_mathias or Mathias).
    Outputs both a combined multiline string and the single latest message.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "send_to": ("STRING", {"default": "Mathias", "multiline": False, "placeholder": "Recipient visual name or username (e.g. Mathias or ko_mathias)"}),
                "message_count": ("INT", {"default": 1, "min": 1, "max": 50, "step": 1, "tooltip": "Number of latest messages to read from the chat."}),
            },
            "optional": {
                "filter_sender": (["recipient_only", "all", "me_only"], {"default": "recipient_only", "tooltip": "Filter to only read incoming messages from the recipient, only outgoing from ME, or all."}),
                "join_delimiter": ("STRING", {"default": "\\n", "multiline": False, "advanced": True, "tooltip": "Delimiter used to join multiple messages together."}),
                "include_sender_prefix": ("BOOLEAN", {"default": False, "advanced": True, "tooltip": "Prefix each message with the sender name (e.g. 'Mathias: ...')."}),
                "headless": ("BOOLEAN", {"default": True, "advanced": True, "tooltip": "Run browser in background without showing a window."}),
                "profile_name": ("STRING", {"default": "default", "multiline": False, "advanced": True, "tooltip": "Folder name under user/snapchat_profiles/ for persistent session tokens."}),
                "timeout": ("INT", {"default": 60, "min": 10, "max": 300, "step": 5, "advanced": True, "tooltip": "Max wait time in seconds for page navigation."}),
                "debug_screenshots": ("BOOLEAN", {"default": False, "advanced": True, "tooltip": "Capture screenshots during the read operation."}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "INT")
    RETURN_NAMES = ("messages_text", "latest_message", "count")
    FUNCTION = "read_messages"
    CATEGORY = SNAPCHAT_CATEGORY
    OUTPUT_NODE = True

    def read_messages(
        self,
        send_to,
        message_count=1,
        filter_sender="recipient_only",
        join_delimiter="\n",
        include_sender_prefix=False,
        headless=True,
        profile_name="default",
        timeout=60,
        debug_screenshots=False,
        **kwargs
    ):
        if not send_to or not send_to.strip():
            return ("", "", 0)

        clean_send_to = send_to.strip().lstrip("@")
        clean_profile = profile_name.strip() if profile_name else "default"

        try:
            ensure_playwright()
        except Exception as e:
            print(f"[LeafFlow Snapchat Read] Playwright check error: {e}")
            return ("", "", 0)

        # Unescape literal "\n" in join_delimiter
        delim = join_delimiter.replace("\\n", "\n").replace("\\t", "\t")

        try:
            items, status = run_async_in_isolated_thread(
                read_snapchat_messages_async(
                    send_to=clean_send_to,
                    message_count=message_count,
                    filter_sender=filter_sender,
                    headless=headless,
                    profile_name=clean_profile,
                    timeout=timeout,
                    debug_screenshots=debug_screenshots
                )
            )

            if not items:
                return ("", "", 0)

            formatted_lines = []
            for item in items:
                sender = item.get("sender", "")
                text = item.get("text", "")
                if include_sender_prefix and sender:
                    formatted_lines.append(f"{sender}: {text}")
                else:
                    formatted_lines.append(text)

            combined_text = delim.join(formatted_lines)
            latest_msg = formatted_lines[-1] if formatted_lines else ""

            return (combined_text, latest_msg, len(items))

        except Exception as e:
            print(f"[LeafFlow Snapchat Read] Execution error: {e}")
            return ("", "", 0)
