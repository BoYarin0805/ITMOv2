"""Локальный post-edit hook: событие изменения → доверенный runner → JSON-результат."""

import fcntl
import hashlib
import json
import os
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / ".runtime"


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def save_json(name, data):
    RUNTIME.mkdir(exist_ok=True)
    target = RUNTIME / name
    temporary = target.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(target)


def read_json(name, default=None):
    try:
        return json.loads((RUNTIME / name).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def fingerprint():
    paths = list(ROOT.glob("*.py"))
    for folder in ("static", "tests", "scripts", ".agents"):
        paths.extend((ROOT / folder).rglob("*"))
    digest = hashlib.sha256()
    for path in sorted(paths):
        if path.is_file() and not path.is_symlink() and "__pycache__" not in path.parts:
            try:
                digest.update(str(path.relative_to(ROOT)).encode())
                digest.update(path.read_bytes())
            except FileNotFoundError:
                pass
    return digest.hexdigest()


def run_checks(trigger="file-change"):
    RUNTIME.mkdir(exist_ok=True)
    with (RUNTIME / "check.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return {"status": "BUSY", "message": "Проверка уже выполняется."}
        started = timestamp()
        revision = fingerprint()
        save_json("checks.json", {"status": "RUNNING", "started": started, "trigger": trigger})
        try:
            result = subprocess.run(
                ["sh", "scripts/check.sh"], cwd=ROOT, capture_output=True, text=True,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}, timeout=45,
            )
            output = result.stdout + result.stderr
            code = result.returncode
        except subprocess.TimeoutExpired:
            output, code = "Проверка превысила 45 секунд.", 124
        except OSError as exc:
            output, code = str(exc), 127
        report = {"status": "PASS" if code == 0 else "FAIL", "started": started,
                  "finished": timestamp(), "trigger": trigger, "exit_code": code,
                  "fingerprint": revision, "output": output[-10000:]}
        save_json("checks.json", report)
        with (RUNTIME / "hook-history.jsonl").open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(report, ensure_ascii=False) + "\n")
        return report


def history():
    try:
        return [json.loads(line) for line in (RUNTIME / "hook-history.jsonl").read_text().splitlines()[-12:]]
    except (OSError, ValueError):
        return []


class EditWatcher:
    def __init__(self):
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.watch, daemon=True)

    def start(self):
        self.thread.start()

    def watch(self):
        revision = fingerprint()
        run_checks("server-start")
        while not self.stop_event.wait(0.5):
            updated = fingerprint()
            if updated != revision:
                if self.stop_event.wait(0.4):
                    break
                revision = fingerprint()
                report = run_checks("file-change")
                if report["status"] == "BUSY":
                    revision = updated + "-retry"

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=50)
