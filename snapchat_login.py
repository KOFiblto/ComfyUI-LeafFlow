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
    print("1. In the browser that opens, click 'Log in with Google' (or enter credentials).")
    print("2. Complete any 2FA or security prompts.")
    print("3. Once you see your Snapchat Web inbox / camera, your session is saved!")
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
            viewport={"width": 1280, "height": 850},
            permissions=["camera", "microphone"],
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        )
        page = context.new_page()
        page.goto("https://web.snapchat.com")

        print("Browser is open. Waiting for login...")
        logged_in_detected = False

        try:
            while not page.is_closed() and context.pages:
                curr_url = page.url
                if "web.snapchat.com" in curr_url and "accounts.snapchat.com" not in curr_url and "login" not in curr_url:
                    if not logged_in_detected:
                        logged_in_detected = True
                        set_auth_state(True)
                        print("\n[LeafFlow] Login detected and authenticated successfully!")
                elif "accounts.snapchat.com" in curr_url or "login" in curr_url:
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
