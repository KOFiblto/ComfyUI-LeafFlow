import os
import sys
import json
import time
import asyncio
import threading
import subprocess
from datetime import datetime

SNAPCHAT_CATEGORY = "🍃 LeafFlow/Automation"
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")
DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

# ComfyUI interrupt handler
try:
    import comfy.model_management
    def check_interrupted():
        comfy.model_management.throw_exception_if_processing_interrupted()
except Exception:
    def check_interrupted():
        pass

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


async def extract_chat_events_async(page, target_name: str):
    """
    Extracts all chronological messages and snaps from the active chat pane.
    Returns: dict with 'events' (list of dicts) and 'last_sender' ('ME', target_name, or 'UNKNOWN').
    """
    return await page.evaluate("""(targetName) => {
        const rightPane = Array.from(document.querySelectorAll('div'))
            .filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.x > 340 && rect.width > 300 && rect.height > 400;
            });

        if (rightPane.length === 0) return { events: [], last_sender: 'UNKNOWN' };

        const mainText = rightPane[0].innerText || '';
        const rawLines = mainText.split('\\n').map(l => l.trim()).filter(l => l.length > 0);

        const events = [];
        let currentSender = 'UNKNOWN';

        const timeRegex = /^\\d{1,2}:\\d{2}$/;
        const dateRegex = /^\\d{1,2}\\s+[A-Z]+$/i;
        const snapMarkers = ['Delivered', 'Opened', 'Received', 'Pending', 'Tap to view', 'New Snap'];

        for (let i = 0; i < rawLines.length; i++) {
            const line = rawLines[i];

            if (dateRegex.test(line)) continue;
            if (line.includes('SNAPSTREAK') || line.includes('DELETED A CHAT') || line.includes('JOINED SNAPCHAT') || line.includes('YOU ARE USING SNAPCHAT') || line === 'Drag and drop to upload' || line === 'Send chat' || line === 'Send a chat' || line === 'Call') continue;

            if (line.toUpperCase() === 'ME') {
                currentSender = 'ME';
                continue;
            }

            if (line.toUpperCase() === targetName.toUpperCase() || line.toLowerCase() === targetName.toLowerCase()) {
                currentSender = targetName;
                continue;
            }

            if (line.length > 0 && line.length <= 25 && line === line.toUpperCase() && !timeRegex.test(line) && !snapMarkers.includes(line)) {
                currentSender = line;
                continue;
            }

            if (timeRegex.test(line)) continue;

            if (snapMarkers.includes(line)) {
                events.push({
                    sender: currentSender,
                    type: 'snap',
                    text: `[Snap: ${line}]`
                });
                continue;
            }

            events.push({
                sender: currentSender,
                type: 'text',
                text: line
            });
        }

        const last_sender = events.length > 0 ? events[events.length - 1].sender : 'UNKNOWN';
        return { events, last_sender };
    }""", target_name)


async def read_snapchat_messages_async(
    send_to: str,
    message_count: int = 1,
    wait_for_new_message: bool = True,
    poll_interval: int = 3,
    max_wait_seconds: int = 0,
    filter_sender: str = "recipient_only",
    headless: bool = True,
    profile_name: str = "default",
    timeout: int = 60,
    debug_screenshots: bool = False
):
    """
    Reads text messages from recipient chat, optionally waiting if the latest activity in chat is from ME.
    Returns: (list_of_selected_messages, status_message)
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

    log(f"Starting read for '{send_to}' (wait={wait_for_new_message}, count={message_count})...")

    async with async_playwright() as p:
        browser_context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            headless=headless,
            user_agent=DESKTOP_USER_AGENT,
            viewport={"width": 1440, "height": 960},
            permissions=["camera", "microphone"],
            ignore_default_args=["--enable-automation"],
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
            current_url = page.url.lower()
            is_logged_out = (
                "accounts.snapchat.com" in current_url or
                "login" in current_url or
                "www.snapchat.com" in current_url
            )
            if not is_logged_out and "web.snapchat.com" in current_url:
                contacts_count = await page.locator("div[role='listitem'], div.O4POs, input[placeholder*='Search'], button[aria-label*='profile']").count()
                if contacts_count == 0:
                    await page.wait_for_timeout(2000)
                    contacts_count = await page.locator("div[role='listitem'], div.O4POs, input[placeholder*='Search'], button[aria-label*='profile']").count()
                if contacts_count == 0:
                    is_logged_out = True

            if is_logged_out:
                set_snapchat_auth_marker(profile_name, False)
                await save_shot(page, "02_login_required")
                return [], "Not logged in to Snapchat. Please authenticate first via ComfyUI Settings or snapchat_login.py."
            else:
                set_snapchat_auth_marker(profile_name, True)

            # Open chat with recipient
            opened = await open_recipient_chat_async(page, send_to, log)
            if not opened:
                return [], f"Failed to locate and open chat with '{send_to}'."

            await page.wait_for_timeout(2000)
            await save_shot(page, "02_chat_open")

            start_wait_time = time.time()
            first_poll = True

            while True:
                check_interrupted()

                # Extract chat events
                chat_data = await extract_chat_events_async(page, send_to)
                events = chat_data.get("events", [])
                last_sender = chat_data.get("last_sender", "UNKNOWN")

                # Filter text messages according to filter_sender setting
                filtered_text_messages = []
                for ev in events:
                    if ev.get("type") != "text":
                        continue
                    sender = ev.get("sender", "")
                    if filter_sender == "recipient_only" and sender == "ME":
                        continue
                    elif filter_sender == "me_only" and sender != "ME":
                        continue
                    filtered_text_messages.append(ev)

                # Check if we should wait for a new message
                if wait_for_new_message:
                    # If the last item in the chat was from ME, we wait for recipient to reply
                    if last_sender == "ME" or not filtered_text_messages:
                        if first_poll:
                            log(f"Latest activity in chat is from 'ME'. Waiting for '{send_to}' to send a message... (polling every {poll_interval}s)")
                            first_poll = False
                        
                        if max_wait_seconds > 0 and (time.time() - start_wait_time) >= max_wait_seconds:
                            log(f"Max wait time of {max_wait_seconds}s reached. Proceeding with latest available messages.")
                            break

                        await page.wait_for_timeout(poll_interval * 1000)
                        continue

                # Finished waiting or new message arrived from recipient
                break

            await save_shot(page, "03_extracted")

            selected = filtered_text_messages[-message_count:] if message_count > 0 else filtered_text_messages
            log(f"Successfully retrieved {len(selected)} messages (last sender: '{last_sender}').")
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
    Supports 'wait_for_new_message' toggle to automatically pause and poll until the recipient
    replies to your last message/snap.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "send_to": ("STRING", {"default": "Mathias", "multiline": False, "placeholder": "Recipient visual name or username (e.g. Mathias or ko_mathias)"}),
                "wait_for_new_message": ("BOOLEAN", {"default": True, "tooltip": "When enabled (default), pauses and waits if the last message/snap in chat was sent by ME, until the recipient replies."}),
                "message_count": ("INT", {"default": 1, "min": 1, "max": 50, "step": 1, "tooltip": "Number of latest text messages to retrieve."}),
            },
            "optional": {
                "filter_sender": (["recipient_only", "all", "me_only"], {"default": "recipient_only", "tooltip": "Filter to only read incoming messages from recipient, only outgoing from ME, or all."}),
                "poll_interval": ("INT", {"default": 3, "min": 1, "max": 60, "step": 1, "advanced": True, "tooltip": "Polling interval in seconds while waiting for recipient reply."}),
                "max_wait_seconds": ("INT", {"default": 0, "min": 0, "max": 3600, "step": 10, "advanced": True, "tooltip": "Max seconds to wait before continuing anyway (0 = wait indefinitely)."}),
                "join_delimiter": ("STRING", {"default": "\\n", "multiline": False, "advanced": True, "tooltip": "Delimiter used to join multiple messages together."}),
                "include_sender_prefix": ("BOOLEAN", {"default": False, "advanced": True, "tooltip": "Prefix each message with sender name (e.g. 'Mathias: ...')."}),
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

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Force fresh execution on every queue run
        return float("nan")

    def read_messages(
        self,
        send_to,
        wait_for_new_message=True,
        message_count=1,
        filter_sender="recipient_only",
        poll_interval=3,
        max_wait_seconds=0,
        join_delimiter="\n",
        include_sender_prefix=False,
        headless=True,
        profile_name="default",
        timeout=60,
        debug_screenshots=False,
        **kwargs
    ):
        print(f"[LeafFlow Snapchat Read] Fetching messages for '{send_to}' (wait_for_new_message={wait_for_new_message})...")
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
                    wait_for_new_message=wait_for_new_message,
                    poll_interval=poll_interval,
                    max_wait_seconds=max_wait_seconds,
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
