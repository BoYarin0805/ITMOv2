"""Проверка реального источника через HTTP-приложение, отдельно от unit fixtures."""
import json
import sys
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler

root = Path(__file__).resolve().parents[1]
report = {"time": datetime.now(timezone.utc).isoformat(), "source": "real Open-Meteo HTTP responses", "status": "FAIL", "responses": {}}
http = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
thread = threading.Thread(target=http.serve_forever, daemon=True)
thread.start()
try:
    for path in ("/api/weather?city=spb", "/api/forecast?city=spb"):
        with urlopen(f"http://127.0.0.1:{http.server_port}{path}", timeout=18) as response:
            data = json.load(response)
            report["responses"][path] = {"status": response.status, "data": data}
            if "hours" in data:
                assert len(data["hours"]) == 24
    report["status"] = "PASS"
except Exception as exc:
    report["error"] = str(exc)
finally:
    http.shutdown(); http.server_close(); thread.join()
    (root / "evidence/live-api.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({"status": report["status"], "error": report.get("error"), "paths": list(report["responses"])}, ensure_ascii=False))
raise SystemExit(0 if report["status"] == "PASS" else 1)
