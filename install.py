import os
import sys
import subprocess

def main():
    print("[ComfyUI-LeafFlow] Checking dependencies...")
    dependencies = ["pillow", "piexif", "numpy", "pystray"]
    for dep in dependencies:
        try:
            __import__(dep)
        except ImportError:
            print(f"[ComfyUI-LeafFlow] Installing missing dependency: {dep}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
    
    print("[ComfyUI-LeafFlow] Installation check complete! Restart ComfyUI to activate.")

if __name__ == "__main__":
    main()
