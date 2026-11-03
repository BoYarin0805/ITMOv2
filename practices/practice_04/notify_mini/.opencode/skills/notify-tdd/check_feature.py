"""Запуск тестов для выбранной фичи без внешних зависимостей."""

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SUITES = {"A": "UnsubscribeTests", "B": "ListSubscribersTests"}


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in SUITES:
        print("usage: check_feature.py A|B", file=sys.stderr)
        return 2
    target = f"tests.test_service.{SUITES[sys.argv[1]]}"
    result = subprocess.run(
        [sys.executable, "-B", "-m", "unittest", target, "-v"], cwd=ROOT, check=False
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
