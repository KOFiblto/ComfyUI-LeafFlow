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
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
            except Exception as e:
                print(f"[ComfyUI-LeafFlow] Warning: Failed to install {dep}: {e}")

    print("[ComfyUI-LeafFlow] Dependency check complete! Ready for ComfyUI.")

if __name__ == "__main__":
    main()
