# Contributing

The full guide is in [docs/contributing.md](docs/contributing.md).

Short version:

```bash
git checkout -b feat/my-mcp-tool
python setup.py
# add your tool, tests and docs (see docs/extending.md)
cd mcp-server && python -m pytest
git commit -m "feat: add my MCP tool"
git push origin feat/my-mcp-tool
# then open a Pull Request
```

Please keep contributions small, readable and runnable without secrets.
