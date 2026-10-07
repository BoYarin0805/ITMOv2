"""Минимальный MCP stdio-сервер для запуска проверок Notify Mini."""

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOOL = {
    "name": "run_checks",
    "description": "Запускает тесты Notify Mini: отдельную фичу A/B или весь набор.",
    "inputSchema": {
        "type": "object",
        "properties": {"suite": {"type": "string", "enum": ["A", "B", "all"]}},
        "required": ["suite"],
        "additionalProperties": False,
    },
}


def tool_call(params: dict) -> dict:
    arguments = params.get("arguments", {})
    suite = arguments.get("suite") if isinstance(arguments, dict) else None
    if (
        params.get("name") != "run_checks"
        or not isinstance(arguments, dict)
        or set(arguments) != {"suite"}
        or suite not in ("A", "B", "all")
    ):
        return {"content": [{"type": "text", "text": "Ошибка: укажите только suite со значением A, B или all"}], "isError": True}
    command = ["sh", "scripts/check.sh"] if suite == "all" else [sys.executable, "-B", ".opencode/skills/notify-tdd/check_feature.py", suite]
    try:
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=30, check=False)
    except subprocess.TimeoutExpired:
        return {"content": [{"type": "text", "text": "Ошибка: проверка превысила 30 секунд"}], "isError": True}
    output = (result.stdout + result.stderr).strip()
    return {"content": [{"type": "text", "text": output or "Проверка завершилась без вывода"}], "isError": result.returncode != 0}


def dispatch(request: dict) -> dict:
    method = request.get("method")
    if method == "initialize":
        version = request.get("params", {}).get("protocolVersion", "2024-11-05")
        result = {"protocolVersion": version, "capabilities": {"tools": {}}, "serverInfo": {"name": "notify-checks", "version": "1.0.0"}}
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": [TOOL]}
    elif method == "tools/call":
        result = tool_call(request.get("params", {}))
    else:
        return {"jsonrpc": "2.0", "id": request.get("id"), "error": {"code": -32601, "message": "Method not found"}}
    return {"jsonrpc": "2.0", "id": request.get("id"), "result": result}


def main() -> None:
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if "id" not in request:
                continue
            response = dispatch(request)
        except (ValueError, TypeError, AttributeError) as exc:
            response = {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": str(exc)}}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
