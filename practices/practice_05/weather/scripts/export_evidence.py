"""Сохраняет снимки реальных запусков для сдачи. Не генерирует результаты проверок."""
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
destination = root / "evidence"
destination.mkdir(exist_ok=True)
for name in ("skill.json", "mcp.json", "checks.json", "hook-demo.json"):
    source = root / ".runtime" / name
    if not source.exists():
        raise SystemExit(f"Сначала выполните демонстрацию: отсутствует {name}")
    data = json.loads(source.read_text())
    shutil.copyfile(source, destination / name)
    print(name, data.get("status", "unknown"))
