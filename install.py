import os
import sys
import subprocess

def main():
    print("[ComfyUI-FlowControl] Checking dependencies...")
    dependencies = ["pillow", "piexif", "numpy"]
    for dep in dependencies:
        try:
            __import__(dep)
        except ImportError:
            print(f"[ComfyUI-FlowControl] Installing missing dependency: {dep}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
    
    print("[ComfyUI-FlowControl] Installation check complete! Restart ComfyUI to activate.")

if __name__ == "__main__":
    main()
