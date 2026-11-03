"""Минимальный клиент для воспроизводимого вызова MCP через настоящий stdio transport."""
import json
import os
import select
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class Client:
    def __enter__(self):
        self.process = subprocess.Popen(
            [sys.executable, "-B", str(ROOT / "mcp_server.py")], cwd=ROOT,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )
        self.messages = []
        self.sequence = 0
        return self

    def send(self, request):
        self.messages.append({"direction": "client→server", "message": request})
        self.process.stdin.write(json.dumps(request, ensure_ascii=False) + "\n")
        self.process.stdin.flush()

    def call(self, method, params=None):
        self.sequence += 1
        self.send({"jsonrpc": "2.0", "id": self.sequence, "method": method, "params": params or {}})
        if not select.select([self.process.stdout], [], [], 20)[0]:
            raise TimeoutError("MCP server did not respond within 20 seconds")
        line = self.process.stdout.readline()
        if not line:
            raise RuntimeError("MCP server closed stdout")
        response = json.loads(line)
        self.messages.append({"direction": "server→client", "message": response})
        if response.get("id") != self.sequence:
            raise RuntimeError("Unexpected MCP response id")
        if "error" in response:
            raise RuntimeError(response["error"])
        return response["result"]

    def initialize(self):
        result = self.call("initialize", {"protocolVersion": "2025-03-26", "capabilities": {},
                                         "clientInfo": {"name": "weather-demo-client", "version": "1.0.0"}})
        self.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        return result

    def __exit__(self, *args):
        self.process.stdin.close()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            self.process.wait(timeout=3)
        self.process.stdout.close()
        self.process.stderr.close()
