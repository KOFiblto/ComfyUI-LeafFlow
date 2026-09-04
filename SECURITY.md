# Security Policy

## Reporting Security Issues

We take the security of ComfyUI-LeafFlow seriously. If you discover a security vulnerability or sensitive key exposure, please **DO NOT** open a public issue.

Instead, please report security vulnerabilities directly to the maintainer via GitHub private vulnerability reporting.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :white_check_mark: |

## Security Architecture & Best Practices

- **Loopback Enforcement for Server Control**: All administrative endpoints (power controls `/leafflow/power/*`, settings modification `/leafflow/settings`, and internal state synchronization `/leafflow/batch_queue/*`) strictly verify loopback origin (`127.0.0.1` / `::1`), rejecting remote network requests with `403 Forbidden`.
- **Filesystem Path Confinement**: Image loading (`VisualImageLoader`) and thumbnail file streaming endpoints are strictly confined to standard ComfyUI `input`, `output`, and `temp` directories with path canonicalization and directory traversal guards.
- **Opt-In Network Requests**: External metadata and preview scraping (Civitai / TMDB) are completely opt-in and disabled by default.
- **No Dynamic Package Installation**: Runtime `pip` execution (`install.py` / `subprocess`) is eliminated; all dependencies are transparently listed in `requirements.txt`.
- **Local Environment**: All API keys (Civitai / TMDB) are stored locally in `.env` and are strictly excluded from git tracking via `.gitignore`. Sensitive keys are masked in server log outputs.
- **Atomic File Writes**: Atomic file operations (`.tmp` + `os.replace`) prevent JSON file corruption on sudden system shutdown or crash.
