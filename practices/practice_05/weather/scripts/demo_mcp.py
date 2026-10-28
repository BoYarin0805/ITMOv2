import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation import save_json, timestamp
from mcp_client import Client


def demo():
    report = {"time": timestamp(), "transport": "stdio", "client": "weather-demo-client", "status": "FAIL"}
    with Client() as client:
        try:
            report["initialize"] = client.initialize()
            report["tools"] = client.call("tools/list")["tools"]
            invalid = client.call("tools/call", {"name": "get_weather", "arguments": {"name": "Ошибка", "latitude": 999, "longitude": 0}})
            if not invalid.get("isError"):
                raise RuntimeError("Ошибочная широта не отклонена")
            report["invalid_input"] = invalid
            found = client.call("tools/call", {"name": "search_city", "arguments": {"query": "Выборг"}})
            if found.get("isError"):
                raise RuntimeError(found["content"][0]["text"])
            cities = json.loads(found["content"][0]["text"])["cities"]
            if not cities:
                raise RuntimeError("Выборг не найден")
            # Это фиксированный демонстрационный запрос; в диалоге выбор среди совпадений делает человек.
            city = cities[0]
            report["selected_city"] = city
            weather = client.call("tools/call", {"name": "get_weather", "arguments": {
                key: city[key] for key in ("name", "latitude", "longitude")}})
            if weather.get("isError"):
                raise RuntimeError(weather["content"][0]["text"])
            report["weather"] = json.loads(weather["content"][0]["text"])
            report["status"] = "PASS"
        except (OSError, ValueError, RuntimeError, TimeoutError) as exc:
            report["error"] = str(exc)
        finally:
            report["messages"] = client.messages
            save_json("mcp.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(demo())
