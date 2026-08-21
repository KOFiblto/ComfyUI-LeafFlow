import os
import sys
import subprocess

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(CURRENT_DIR, "user", "snapchat_profiles")
DEFAULT_PROFILE = os.path.join(PROFILES_DIR, "default")


def main():
    os.makedirs(DEFAULT_PROFILE, exist_ok=True)
    print("=" * 65)
    print("🍃 LeafFlow: Snapchat 1-Click Browser Authenticator")
    print("=" * 65)
    print(f"Profile Directory: {DEFAULT_PROFILE}")
    print("\nLaunching browser window...")
    print("1. In the browser that opens, click 'Log in with Google' (or enter credentials).")
    print("2. Complete any 2FA or security prompts.")
    print("3. Once you see your Snapchat Web inbox / camera, you can close the browser window.")
    print("4. Your session will be saved permanently for the ComfyUI node!\n")

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
            viewport={"width": 1280, "height": 850},
            permissions=["camera", "microphone"],
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox"
            ]
        )
        page = context.new_page()
        page.goto("https://web.snapchat.com")

        print("\nBrowser is open. Waiting for you to finish logging in...")
        print("(Press Ctrl+C in this terminal or simply close the browser window when done.)\n")

        try:
            while True:
                # Check if page is closed
                if page.is_closed() or not context.pages:
                    break
                page.wait_for_timeout(1000)
        except Exception:
            pass
        finally:
            try:
                context.close()
            except Exception:
                pass

        print("\nSession saved successfully! You can now use the Snapchat Camera Snap node in ComfyUI!")


if __name__ == "__main__":
    main()
