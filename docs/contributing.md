# Contributing

Thanks for helping improve the workshop! New MCP tools, exercises, docs fixes and UI polish are all welcome.

Keep contributions in the spirit of the project: **small, readable, beginner-friendly**, and runnable without secrets or paid services.

## 1. Fork

Click **Fork** on the GitHub repository page to get your own copy.

## 2. Clone

```bash
git clone https://github.com/<your-username>/mcp-vs-api-demo.git
cd mcp-vs-api-demo
```

## 3. Create a branch

```bash
git checkout -b feat/my-mcp-tool
```

Branch name ideas: `feat/unit-converter-tool`, `docs/fix-typo`, `fix/calculator-rounding`.

## 4. Setup

```bash
python setup.py
```

Then add your `GROQ_API_KEY` to `backend/.env` (see the [README](../README.md#configure-groq)).

## 5. Implement

Add your tool. [extending.md](extending.md) lists exactly which files to touch. For a new MCP tool that's usually:

- `mcp-server/tools.py`: the function
- `mcp-server/server.py`: `@mcp.tool()` registration
- `mcp-server/tests/test_server.py`: tests
- `docs/` or `README.md`: a line explaining the tool

Guidelines:

- Python: PEP 8, type hints, small functions, clear names.
- TypeScript: strict types, no `any`, small components.
- No new API keys or secrets. Use demo data or public, unauthenticated APIs.
- No `eval()`, shell commands or arbitrary file access in tools.
- Keep dependencies minimal. Ask in an issue before adding one.

## 6. Test

```bash
# MCP server (venv active)
cd mcp-server
python -m pytest

# Backend (venv active)
cd backend
python -m pytest

# Frontend
cd frontend
npm test
npm run build
```

Then try your tool in the simulator with **Run MCP**.

## 7. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/) style messages:

```bash
git add .
git commit -m "feat: add timezone MCP tool"
```

Common prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

Double-check that `.env` is **not** in `git status`. It is git-ignored, so it should never show up.

## 8. Push

```bash
git push origin feat/my-mcp-tool
```

## 9. Open a Pull Request

Open a PR from your branch on GitHub. The template asks for:

- **What** you added
- **Why** it's useful
- **How** to test it (the prompt you used in the simulator is perfect)
- **Screenshots** if the UI changed

CI runs the Python tests and the frontend build on every PR.

---

Found a bug or have an idea? Open an issue using the **Feature request** template.
