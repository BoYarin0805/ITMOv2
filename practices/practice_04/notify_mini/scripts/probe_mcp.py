"""Проверить handshake, успешный вызов и ошибочный аргумент MCP."""

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def exchange(process: subprocess.Popen, request: dict) -> dict:
    process.stdin.write(json.dumps(request, ensure_ascii=False) + "\n")
    process.stdin.flush()
    return json.loads(process.stdout.readline())


def main() -> int:
    process = subprocess.Popen(
        [sys.executable, "-B", "mcp/server.py"], cwd=ROOT,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True,
    )
    try:
        init = exchange(process, {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}})
        listed = exchange(process, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        good = exchange(process, {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "run_checks", "arguments": {"suite": "all"}}})
        bad = exchange(process, {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "run_checks", "arguments": {"suite": "wrong"}}})
        extra = exchange(process, {"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "run_checks", "arguments": {"suite": "all", "unexpected": True}}})
        assert init["result"]["serverInfo"]["name"] == "notify-checks"
        assert listed["result"]["tools"][0]["name"] == "run_checks"
        assert good["result"]["isError"] is False
        assert "OK" in good["result"]["content"][0]["text"]
        assert bad["result"]["isError"] is True
        assert extra["result"]["isError"] is True
        print(json.dumps({"initialize": init["result"]["serverInfo"], "tools": [tool["name"] for tool in listed["result"]["tools"]], "success": good["result"], "invalid_input": bad["result"], "extra_argument": extra["result"]}, ensure_ascii=False, indent=2))
        return 0
    finally:
        process.terminate()
        process.wait(timeout=5)


if __name__ == "__main__":
    raise SystemExit(main())
