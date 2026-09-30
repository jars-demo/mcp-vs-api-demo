"""
One-command setup for the MCP vs API workshop.

    python setup.py          set everything up (safe to run again)
    python setup.py --run    optional: start all three services in this terminal

What `python setup.py` does:

    1. checks Python, Node.js and npm (it never installs system software)
    2. creates backend/.venv and installs backend/requirements.txt
    3. creates mcp-server/.venv and installs mcp-server/requirements.txt
    4. runs `npm install` in frontend/
    5. creates backend/.env and mcp-server/.env from the .env.example files

It never deletes anything. Steps that are already done are skipped.

Note: this is a plain script, not a setuptools file. Run it with `python setup.py`.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import platform
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
MCP_SERVER = ROOT / "mcp-server"
FRONTEND = ROOT / "frontend"

IS_WINDOWS = os.name == "nt"
MIN_PYTHON = (3, 10)
MIN_NODE = (20, 19)

# ─────────────────────────────────────────────────────────────
#  Output helpers
# ─────────────────────────────────────────────────────────────


def _supports_unicode() -> bool:
    try:
        "✓✗─".encode(sys.stdout.encoding or "ascii")
        return True
    except (UnicodeEncodeError, LookupError):
        return False


UNICODE = _supports_unicode()
OK = "✓" if UNICODE else "OK"
FAIL = "✗" if UNICODE else "X"
LINE = "=" * 44


def banner(text: str) -> None:
    print(f"\n{LINE}\n {text}\n{LINE}\n")


def ok(text: str) -> None:
    print(f"[{OK}] {text}")


def warn(text: str) -> None:
    print(f"[!] {text}")


def fail(text: str) -> None:
    print(f"[{FAIL}] {text}")


class SetupError(Exception):
    """A step failed. The message explains what to do."""


# ─────────────────────────────────────────────────────────────
#  Prerequisite checks
# ─────────────────────────────────────────────────────────────


def _version_tuple(text: str) -> tuple[int, ...]:
    digits = text.strip().lstrip("v").split(".")
    return tuple(int(part) for part in digits[:3] if part.isdigit())


def check_python() -> None:
    version = ".".join(map(str, sys.version_info[:3]))
    if sys.version_info < MIN_PYTHON:
        raise SetupError(
            f"Python {version} found, but Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ is required.\n"
            "    Install it from https://www.python.org/downloads/ and run this script with it."
        )
    ok(f"Python {version} detected")


def find_node() -> str | None:
    """Return the npm executable if Node.js + npm are usable, else explain what is missing."""
    node = shutil.which("node")
    if node is None:
        fail("Node.js not found")
        print(f"    Install Node.js {MIN_NODE[0]}.{MIN_NODE[1]}+ (LTS recommended) from https://nodejs.org/")
        return None
    node_version = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip()
    if _version_tuple(node_version)[:2] < MIN_NODE:
        fail(f"Node.js {node_version} found, but {MIN_NODE[0]}.{MIN_NODE[1]}+ is required")
        print("    Update Node.js from https://nodejs.org/")
        return None
    ok(f"Node.js {node_version} detected")

    npm = shutil.which("npm")
    if npm is None:
        fail("npm not found (it normally comes with Node.js)")
        print("    Reinstall Node.js from https://nodejs.org/")
        return None
    npm_version = subprocess.run([npm, "--version"], capture_output=True, text=True).stdout.strip()
    ok(f"npm {npm_version} detected")
    return npm


# ─────────────────────────────────────────────────────────────
#  Setup steps
# ─────────────────────────────────────────────────────────────


def venv_python(project: Path) -> Path:
    folder = "Scripts" if IS_WINDOWS else "bin"
    name = "python.exe" if IS_WINDOWS else "python"
    return project / ".venv" / folder / name


def _file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _run(command: list[str], cwd: Path, what: str) -> None:
    """Run a command quietly; show its output only if it fails."""
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        output = (result.stdout + result.stderr).strip().splitlines()
        print("\n".join("    " + line for line in output[-25:]))
        raise SetupError(f"{what} failed (exit code {result.returncode}). See the output above.")


def create_venv(project: Path) -> None:
    python = venv_python(project)
    relative = project.relative_to(ROOT).as_posix()
    if python.exists():
        ok(f"{relative}/.venv already exists")
        return
    print(f"    Creating {relative}/.venv ...")
    _run([sys.executable, "-m", "venv", ".venv"], project, f"Creating {relative}/.venv")
    ok(f"{relative}/.venv created")


def install_python_requirements(project: Path, label: str) -> None:
    requirements = project / "requirements.txt"
    marker = project / ".venv" / ".requirements.sha256"
    wanted = _file_hash(requirements)
    if marker.exists() and marker.read_text().strip() == wanted:
        ok(f"{label} dependencies already installed")
        return
    print(f"    Installing {label} dependencies (this can take a minute) ...")
    _run(
        [str(venv_python(project)), "-m", "pip", "install", "--disable-pip-version-check", "-r", "requirements.txt"],
        project,
        f"Installing {label} dependencies",
    )
    marker.write_text(wanted)
    ok(f"{label} dependencies installed")


def install_frontend(npm: str) -> None:
    lockfile = FRONTEND / "package-lock.json"
    marker = FRONTEND / "node_modules" / ".setup.sha256"
    wanted = _file_hash(lockfile) if lockfile.exists() else _file_hash(FRONTEND / "package.json")
    if marker.exists() and marker.read_text().strip() == wanted:
        ok("Frontend dependencies already installed")
        return
    print("    Running npm install (this can take a minute) ...")
    _run([npm, "install", "--no-fund", "--no-audit"], FRONTEND, "npm install")
    marker.write_text(wanted)
    ok("Frontend dependencies installed")


def create_env_file(project: Path) -> None:
    example, target = project / ".env.example", project / ".env"
    relative = target.relative_to(ROOT).as_posix()
    if target.exists():
        ok(f"{relative} already exists (kept as is)")
        return
    shutil.copyfile(example, target)
    ok(f"{relative} created from .env.example")


def groq_key_configured() -> bool:
    env_file = BACKEND / ".env"
    if not env_file.exists():
        return False
    for line in env_file.read_text(encoding="utf-8").splitlines():
        key, _, value = line.partition("=")
        if key.strip() == "GROQ_API_KEY":
            return bool(value.strip().strip("\"'"))
    return False


def print_next_steps(frontend_ready: bool) -> None:
    activate = ".venv\\Scripts\\activate" if IS_WINDOWS else "source .venv/bin/activate"
    step = 1
    print("Next steps:\n")
    if not groq_key_configured():
        print(f"{step}. Add your Groq API key (free: https://console.groq.com/keys):")
        print("   backend/.env  ->  GROQ_API_KEY=your-key\n")
        step += 1
    print(f"{step}. Terminal 1: start the MCP server")
    print(f"   cd mcp-server\n   {activate}\n   python server.py\n")
    print(f"{step + 1}. Terminal 2: start the backend")
    print(f"   cd backend\n   {activate}\n   python app.py\n")
    print(f"{step + 2}. Terminal 3: start the frontend")
    print("   cd frontend\n   npm run dev\n")
    if frontend_ready:
        print(f"{step + 3}. Open http://localhost:5173/simulator and click Run Both.\n")
    print("Optional: `python setup.py --run` starts all three in this terminal.")


def setup() -> int:
    banner("MCP vs API Workshop Setup")
    print(f"    Operating system: {platform.system()} ({platform.machine()})\n")

    check_python()
    npm = find_node()
    print()

    print("[1/4] Backend environment")
    create_venv(BACKEND)
    install_python_requirements(BACKEND, "Backend")
    print()

    print("[2/4] MCP server environment")
    create_venv(MCP_SERVER)
    install_python_requirements(MCP_SERVER, "MCP server")
    print()

    print("[3/4] Frontend dependencies")
    if npm:
        install_frontend(npm)
    else:
        fail("Skipped: Node.js/npm is missing (see above)")
    print()

    print("[4/4] Environment files")
    create_env_file(BACKEND)
    create_env_file(MCP_SERVER)
    if not groq_key_configured():
        warn("GROQ_API_KEY is empty in backend/.env. Add it before running a prompt.")

    if npm is None:
        banner("Setup incomplete")
        print("Python parts are ready. Install Node.js, then run `python setup.py` again.\n")
        return 1

    banner("Setup complete!")
    print_next_steps(frontend_ready=True)
    return 0


# ─────────────────────────────────────────────────────────────
#  Optional: python setup.py --run
# ─────────────────────────────────────────────────────────────


def _stream(name: str, process: subprocess.Popen[str]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        print(f"[{name:<8}] {line.rstrip()}", flush=True)


def _stop(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    if IS_WINDOWS:
        # npm starts child processes; stop the whole tree.
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(process.pid)], capture_output=True)
    else:
        process.send_signal(signal.SIGINT)
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


def run_all() -> int:
    npm = shutil.which("npm")
    missing = [path for path in (venv_python(BACKEND), venv_python(MCP_SERVER)) if not path.exists()]
    if missing or npm is None or not (FRONTEND / "node_modules").exists():
        fail("Not set up yet. Run `python setup.py` first.")
        return 1

    banner("Starting all services  (Ctrl+C to stop)")
    env = {**os.environ, "PYTHONUNBUFFERED": "1", "PYTHONIOENCODING": "utf-8", "FORCE_COLOR": "0"}
    services = [
        ("mcp", [str(venv_python(MCP_SERVER)), "server.py"], MCP_SERVER),
        ("backend", [str(venv_python(BACKEND)), "app.py"], BACKEND),
        ("frontend", [npm, "run", "dev"], FRONTEND),
    ]
    processes: list[subprocess.Popen[str]] = []
    try:
        for name, command, cwd in services:
            process = subprocess.Popen(
                command,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            processes.append(process)
            threading.Thread(target=_stream, args=(name, process), daemon=True).start()
            time.sleep(1.5)
        print("\n    Open http://localhost:5173/simulator\n", flush=True)
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        fail("A service stopped. Check its output above.")
        return 1
    except KeyboardInterrupt:
        print("\nStopping services ...")
        return 0
    finally:
        for process in processes:
            _stop(process)


def main() -> int:
    # Never crash on characters the console cannot show (e.g. Vite's arrows on Windows).
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    parser = argparse.ArgumentParser(description="Set up (and optionally run) the MCP vs API workshop.")
    parser.add_argument("--run", action="store_true", help="start the MCP server, backend and frontend together")
    args = parser.parse_args()
    try:
        return run_all() if args.run else setup()
    except SetupError as error:
        fail(str(error))
        return 1


if __name__ == "__main__":
    sys.exit(main())
