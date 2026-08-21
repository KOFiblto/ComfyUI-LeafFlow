import os
import sys
import subprocess

def main():
    print("[ComfyUI-LeafFlow] Checking dependencies...")
    dependencies = ["pillow", "piexif", "numpy", "pystray", "playwright"]
    for dep in dependencies:
        try:
            __import__(dep)
        except ImportError:
            print(f"[ComfyUI-LeafFlow] Installing missing dependency: {dep}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
    
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            if not os.path.exists(p.chromium.executable_path):
                subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    except Exception:
        try:
            subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
        except Exception:
            pass

    print("[ComfyUI-LeafFlow] Installation check complete! Restart ComfyUI to activate.")

if __name__ == "__main__":
    main()
