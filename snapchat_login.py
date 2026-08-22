import os
import sys
import json
import time
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")
DEFAULT_PROFILE = os.path.join(PROFILES_DIR, "default")
AUTH_MARKER_FILE = os.path.join(DEFAULT_PROFILE, "auth_state.json")
DESKTOP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"


def set_auth_state(logged_in: bool):
    os.makedirs(DEFAULT_PROFILE, exist_ok=True)
    try:
        with open(AUTH_MARKER_FILE, "w", encoding="utf-8") as f:
            json.dump({"logged_in": logged_in, "updated_at": time.time()}, f)
    except Exception as e:
        print(f"[LeafFlow] Warning saving auth state: {e}")


def main():
    os.makedirs(DEFAULT_PROFILE, exist_ok=True)
    print("=" * 65)
    print("[LeafFlow] Snapchat 1-Click Browser Authenticator")
    print("=" * 65)
    print(f"Profile Directory: {DEFAULT_PROFILE}")
    print("\nLaunching browser window...")
    print("1. In the browser that opens, log in (Google or Snapchat credentials).")
    print("2. Complete any 2FA or security prompts.")
    print("3. Once your contacts / camera feed appear, the session is saved!")
    print("4. Close the browser window when finished.\n")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[LeafFlow] Installing Playwright...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=DEFAULT_PROFILE,
            headless=False,
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
        page = context.new_page()
        page.goto("https://web.snapchat.com")

        print("Browser is open. Waiting for login...")
        logged_in_detected = False

        try:
            while not page.is_closed() and context.pages:
                curr_url = page.url.lower()
                is_logged_out = (
                    "accounts.snapchat.com" in curr_url or
                    "login" in curr_url or
                    "www.snapchat.com" in curr_url
                )
                
                if not is_logged_out and "web.snapchat.com" in curr_url:
                    has_contacts = page.locator("div[role='listitem'], div.O4POs, input[placeholder*='Search'], button[aria-label*='profile']").count()
                    if has_contacts > 0:
                        if not logged_in_detected:
                            logged_in_detected = True
                            set_auth_state(True)
                            print("\n[LeafFlow] Login verified and saved permanently!")
                else:
                    logged_in_detected = False
                    set_auth_state(False)

                page.wait_for_timeout(1000)
        except Exception:
            pass
        finally:
            try:
                context.close()
            except Exception:
                pass

        if logged_in_detected:
            print("\n[LeafFlow] Session saved successfully! You can now use Snapchat nodes in ComfyUI.")
        else:
            print("\n[LeafFlow] Browser closed.")


if __name__ == "__main__":
    main()
