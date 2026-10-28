"""Обработчик штатного PostToolUse Codex; не запускает команды из входного JSON."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation import run_checks

event = json.load(sys.stdin)
if event.get("hook_event_name") == "PostToolUse":
    report = run_checks("codex-PostToolUse")
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": f"Погодный проект: {report['status']}\n{report.get('output', '')[-6000:]}",
    }}, ensure_ascii=False))
