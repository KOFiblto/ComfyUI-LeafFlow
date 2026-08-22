# 🤖 Gemini / Antigravity Agent Guidelines

> **IMPORTANT**: This repository follows the strict developer and agent guidelines defined in [`AGENT.md`](./AGENT.md).

## Mandatory Agent Rules:
1. **Never push directly to `main`**: All changes must be developed on a dedicated branch (`feature/...`, `fix/...`, `docs/...`) and submitted via Pull Request or merged with explicit user confirmation.
2. **User Data Separation**: All user states, caches, `.env` files, and usage counters must reside in `ComfyUI/user/default/LeafFlow/` via `nodes.utils.get_leafflow_user_dir()`. Never write user data into the repository root.
3. **Cross-Platform Safety**: Avoid raw Unicode emojis in backend `print()` calls to prevent `cp1252` encoding errors on Windows.
4. **Documentation Sync**: When modifying nodes or settings, keep [`README.md`](./README.md), [`WALKTHROUGH.md`](./WALKTHROUGH.md), [`CONTRIBUTING.md`](./CONTRIBUTING.md), and [`CHANGELOG.md`](./CHANGELOG.md) synchronized.
5. **Unit Tests & CI**: Ensure all unit tests in `tests/` pass (`python tests/run_tests.py`) before completing any task.

For full technical specifications, architecture diagrams, and checklists, read:
👉 **[AGENT.md](./AGENT.md)**
