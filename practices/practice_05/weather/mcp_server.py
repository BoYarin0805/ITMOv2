"""Небольшой MCP stdio server, протокол 2025-03-26. Stdout — только JSON-RPC."""
import json
import sys

from server import WeatherUnavailable, fetch_weather, search_cities

TOOLS = [
    {"name": "search_city", "description": "Найти города по названию; при совпадениях предложить пользователю выбрать регион/страну.",
     "inputSchema": {"type": "object", "properties": {"query": {"type": "string", "minLength": 2, "maxLength": 100}},
                     "required": ["query"], "additionalProperties": False},
     "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": True}},
    {"name": "get_weather", "description": "Получить реальную текущую погоду по координатам выбранного результата search_city.",
     "inputSchema": {"type": "object", "properties": {
         "name": {"type": "string", "minLength": 1, "maxLength": 200},
         "latitude": {"type": "number", "minimum": -90, "maximum": 90},
         "longitude": {"type": "number", "minimum": -180, "maximum": 180}},
         "required": ["name", "latitude", "longitude"], "additionalProperties": False},
     "annotations": {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": True}},
]


def call_tool(name, arguments):
    try:
        if not isinstance(arguments, dict):
            raise ValueError("Аргументы должны быть объектом.")
        if name == "search_city":
            if set(arguments) != {"query"} or not isinstance(arguments["query"], str):
                raise ValueError("Нужно строковое поле query без дополнительных полей.")
            data = search_cities(arguments["query"])
        elif name == "get_weather":
            if set(arguments) != {"name", "latitude", "longitude"}:
                raise ValueError("Нужны name, latitude и longitude без дополнительных полей.")
            if any(isinstance(arguments[key], bool) or not isinstance(arguments[key], (int, float)) for key in ("latitude", "longitude")):
                raise ValueError("Координаты должны быть числами.")
            data = fetch_weather(**arguments)
        else:
            raise ValueError("Неизвестный инструмент.")
        return {"content": [{"type": "text", "text": json.dumps(data, ensure_ascii=False, allow_nan=False)}], "isError": False}
    except (ValueError, WeatherUnavailable) as exc:
        return {"content": [{"type": "text", "text": str(exc)}], "isError": True}


class Session:
    def __init__(self):
        self.initialized = False

    def handle(self, request):
        request_id = request.get("id") if isinstance(request, dict) else None

        def error(code, message):
            return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}

        if not isinstance(request, dict) or request.get("jsonrpc") != "2.0" or not isinstance(request.get("method"), str):
            return error(-32600, "Invalid Request")
        if "id" not in request:
            return None
        method, params = request["method"], request.get("params", {})
        if not isinstance(params, dict):
            return error(-32602, "Invalid params")
        if method == "initialize":
            self.initialized = True
            result = {"protocolVersion": "2025-03-26", "capabilities": {"tools": {"listChanged": False}},
                      "serverInfo": {"name": "weather-practice", "version": "1.0.0"}}
        elif method == "ping":
            result = {}
        elif not self.initialized:
            return error(-32000, "Initialize session first")
        elif method == "tools/list":
            result = {"tools": TOOLS}
        elif method == "tools/call":
            result = call_tool(params.get("name"), params.get("arguments", {}))
        else:
            return error(-32601, "Method not found")
        return {"jsonrpc": "2.0", "id": request_id, "result": result}


def main():
    session = Session()
    for line in sys.stdin:
        try:
            request = json.loads(line, parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
            if isinstance(request, list):
                response = [result for item in request if (result := session.handle(item)) is not None]
                response = response or None
            else:
                response = session.handle(request)
        except ValueError:
            response = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        if response is not None:
            print(json.dumps(response, ensure_ascii=False, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
