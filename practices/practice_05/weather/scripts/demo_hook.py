"""Настоящие изменения теста → автоматический FAIL → исправление → автоматический PASS."""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation import EditWatcher, ROOT, history, run_checks, save_json, timestamp


def wait_for(status, after=None, trigger=None):
    deadline = time.monotonic() + 55
    while time.monotonic() < deadline:
        for item in reversed(history()):
            if item["status"] == status and (not after or item["started"] > after) and (not trigger or item["trigger"] == trigger):
                return item
        time.sleep(0.2)
    raise TimeoutError(f"Не получен автоматический {status}")


def main():
    probe = ROOT / "tests/test_hook_demo_probe.py"
    if probe.exists():
        raise RuntimeError("Демонстрационный файл уже существует; он не будет перезаписан.")
    watcher = EditWatcher()
    started = timestamp()
    watcher.start()
    try:
        baseline = wait_for("PASS", after=started, trigger="server-start")
        probe.write_text("import unittest\nclass HookProbe(unittest.TestCase):\n    def test_probe(self):\n        self.assertTrue(False, 'Демонстрационный сбой для post-edit hook')\n")
        failure = wait_for("FAIL", after=baseline["started"], trigger="file-change")
        probe.write_text("import unittest\nclass HookProbe(unittest.TestCase):\n    def test_probe(self):\n        self.assertTrue(True)\n")
        success = wait_for("PASS", after=failure["started"], trigger="file-change")
        save_json("hook-demo.json", {"status": "PASS", "sequence": [failure, success],
                                     "mechanism": "file-change watcher", "automatic": True})
        print(json.dumps({"demonstration": "FAIL → PASS", "failure": failure["finished"],
                          "success": success["finished"], "status": "PASS"}, ensure_ascii=False))
    finally:
        probe.unlink(missing_ok=True)
        watcher.stop()
        run_checks("demo-cleanup")


if __name__ == "__main__":
    main()
