# Security Policy

## Reporting Security Issues

We take the security of ComfyUI-FlowControl seriously. If you discover a security vulnerability or sensitive key exposure, please **DO NOT** open a public issue.

Instead, please report security vulnerabilities directly to the maintainer via GitHub private vulnerability reporting.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Security Best Practices

- All API keys (Civitai / TMDB) are stored locally in `.env` and are strictly excluded from git tracking via `.gitignore`.
- API keys are masked in log outputs (e.g. `Bearer civ_*****`).
