import io
import json
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import mcp_server
from scripts.mcp_client import Client
from test_weather import provider_data


class McpTests(unittest.TestCase):
    def test_real_stdio_initialize_discover_and_invalid_call(self):
        with Client() as client:
            info = client.initialize()
            self.assertEqual(info["protocolVersion"], "2025-03-26")
            tools = client.call("tools/list")["tools"]
            self.assertEqual({item["name"] for item in tools}, {"search_city", "get_weather"})
            result = client.call("tools/call", {"name": "get_weather", "arguments": {
                "name": "bad", "latitude": 999, "longitude": 0}})
            self.assertTrue(result["isError"])
            self.assertIn("координаты", result["content"][0]["text"])

    def test_valid_tool_uses_shared_weather_logic(self):
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(provider_data()).encode())):
            result = mcp_server.call_tool("get_weather", {"name": "Выборг", "latitude": 60.7, "longitude": 28.75})
        self.assertFalse(result["isError"])
        data = json.loads(result["content"][0]["text"])
        self.assertEqual(data["city"]["name"], "Выборг")
        self.assertEqual(data["current"]["description"], "Дождь")

    def test_invalid_inputs_never_contact_weather_source(self):
        cases = [
            ("search_city", {"query": 42}), ("search_city", {"query": " "}),
            ("search_city", {"query": "Москва", "extra": 1}),
            ("get_weather", {"name": "bad", "latitude": True, "longitude": 0}),
            ("get_weather", {"name": "bad", "latitude": "10", "longitude": 0}),
            ("get_weather", []), ("missing", {}),
        ]
        for name, arguments in cases:
            with self.subTest(name=name, arguments=arguments), patch("server.urlopen") as fetch:
                self.assertTrue(mcp_server.call_tool(name, arguments)["isError"])
                fetch.assert_not_called()

    def test_session_rejects_uninitialized_or_unknown_methods(self):
        session = mcp_server.Session()
        self.assertIn("error", session.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}))
        session.handle({"jsonrpc": "2.0", "id": 2, "method": "initialize"})
        self.assertEqual(session.handle({"jsonrpc": "2.0", "id": 3, "method": "unknown"})["error"]["code"], -32601)
        self.assertIsNone(session.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}))

    def test_malformed_wire_message_does_not_crash_process(self):
        process = subprocess.run([sys.executable, "-B", str(Path(mcp_server.__file__))],
                                 input='broken\n{"jsonrpc":"2.0","id":1,"method":"ping"}\n',
                                 capture_output=True, text=True, timeout=5)
        self.assertEqual(process.returncode, 0)
        responses = [json.loads(line) for line in process.stdout.splitlines()]
        self.assertEqual(responses[0]["error"]["code"], -32700)
        self.assertEqual(responses[1]["result"], {})
