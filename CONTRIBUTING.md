# Contributing to ComfyUI-FlowControl

Thank you for your interest in contributing to ComfyUI-FlowControl!

## Development Workflow

1. Fork the repository on GitHub.
2. Clone your fork locally into `ComfyUI/custom_nodes/ComfyUI-FlowControl`.
3. Create a feature branch: `git checkout -b feature/my-feature`.
4. Make your changes and test locally in ComfyUI.
5. Ensure code is formatted cleanly and free of hardcoded personal paths or credentials.
6. Commit your changes: `git commit -m "Add new feature"`.
7. Push to your branch and submit a Pull Request.

## Code Guidelines

- **Python**: Follow PEP 8 style guidelines. Ensure thread operations use atomic writes (`.tmp` + `os.replace`).
- **JavaScript**: Follow ES Module conventions. Use `import { app } from "../../scripts/app.js"`.
- **Security**: Never commit personal paths, hardcoded keys, or sensitive `.env` files.
