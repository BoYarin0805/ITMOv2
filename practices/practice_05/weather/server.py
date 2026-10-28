"""Локальный погодный сайт: Python standard library + Open-Meteo."""

import argparse
import json
import math
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import urlopen

from automation import EditWatcher, history, read_json
from forecast import normalize_forecast

STATIC = Path(__file__).parent / "static"
CITIES = {
    "spb": ("Санкт-Петербург", 59.94, 30.31),
    "moscow": ("Москва", 55.75, 37.62),
    "kazan": ("Казань", 55.79, 49.12),
    "sochi": ("Сочи", 43.60, 39.73),
}
FIELDS = (
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "weather_code", "wind_speed_10m", "is_day",
)


class WeatherUnavailable(Exception):
    """Источник недоступен или вернул неполные данные."""


def weather_description(code):
    groups = [
        ((0,), "Ясно"), ((1,), "Преимущественно ясно"),
        ((2,), "Переменная облачность"), ((3,), "Пасмурно"),
        ((45, 48), "Туман"), ((51, 53, 55), "Морось"),
        ((56, 57), "Переохлаждённая морось"), ((61, 63, 65), "Дождь"),
        ((66, 67), "Ледяной дождь"), ((71, 73, 75, 77), "Снег"),
        ((80, 81, 82), "Ливень"), ((85, 86), "Снежный ливень"),
        ((95, 96, 99), "Гроза"),
    ]
    return next((label for codes, label in groups if code in codes), "Неизвестные условия")


def coordinates(latitude, longitude):
    try:
        latitude, longitude = float(latitude), float(longitude)
    except (TypeError, ValueError):
        raise ValueError("Некорректные координаты города.") from None
    if not math.isfinite(latitude) or not math.isfinite(longitude) or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Некорректные координаты города.")
    return latitude, longitude


def search_cities(query):
    query = query.strip()
    if not 2 <= len(query) <= 100:
        raise ValueError("Введите название города: от 2 до 100 символов.")
    url = "https://geocoding-api.open-meteo.com/v1/search?" + urlencode({
        "name": query, "count": 10, "language": "ru", "format": "json",
    })
    try:
        with urlopen(url, timeout=12) as response:
            data = json.load(response)
        results = data.get("results", [])
        if not isinstance(results, list):
            raise ValueError("Invalid search results")
        cities = []
        for item in results:
            lat, lon = coordinates(item["latitude"], item["longitude"])
            name = item["name"]
            if not isinstance(name, str) or not name.strip():
                raise ValueError("Missing city name")
            country, region = item.get("country", ""), item.get("admin1", "")
            if not isinstance(country, str) or not isinstance(region, str):
                raise ValueError("Invalid location")
            cities.append({"name": name, "country": country, "region": region,
                           "latitude": lat, "longitude": lon})
        return {"cities": cities}
    except (URLError, OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        raise WeatherUnavailable("Поиск городов недоступен. Попробуйте ещё раз.") from exc


def resolve_location(city_id=None, *, latitude=None, longitude=None, name=None):
    if city_id is not None:
        if city_id not in CITIES:
            raise ValueError("Выберите город из списка.")
        name, latitude, longitude = CITIES[city_id]
    else:
        latitude, longitude = coordinates(latitude, longitude)
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 200:
            raise ValueError("Укажите название выбранного города.")
        name = name.strip()
    return {"id": city_id, "name": name, "latitude": latitude, "longitude": longitude}


def fetch_weather(city_id=None, *, latitude=None, longitude=None, name=None):
    city = resolve_location(city_id, latitude=latitude, longitude=longitude, name=name)
    query = urlencode({
        "latitude": city["latitude"], "longitude": city["longitude"],
        "current": ",".join(FIELDS), "timezone": "auto", "wind_speed_unit": "ms",
    })
    try:
        with urlopen(f"https://api.open-meteo.com/v1/forecast?{query}", timeout=12) as response:
            data = json.load(response)
        current = data["current"]
        for field in FIELDS:
            value = current[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError("Missing weather value")
        if current["is_day"] not in (0, 1) or not 0 <= current["relative_humidity_2m"] <= 100:
            raise ValueError("Invalid weather value")
        if current["wind_speed_10m"] < 0:
            raise ValueError("Invalid wind speed")
        if not isinstance(current["time"], str) or not isinstance(data["timezone"], str):
            raise ValueError("Missing weather time")
        units = data["current_units"]
        for field in FIELDS:
            if not isinstance(units[field], str):
                raise ValueError("Missing unit")
    except (URLError, OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
        raise WeatherUnavailable("Не удалось получить погоду. Проверьте интернет и попробуйте ещё раз.") from exc
    return {
        "city": city,
        "current": {**{key: current[key] for key in (*FIELDS, "time")},
                    "description": weather_description(current["weather_code"])},
        "units": units, "timezone": data["timezone"],
        "source": {"name": "Open-Meteo", "url": "https://open-meteo.com/"},
    }


def fetch_forecast(city_id=None, *, latitude=None, longitude=None, name=None):
    city = resolve_location(city_id, latitude=latitude, longitude=longitude, name=name)
    query = urlencode({"latitude": city["latitude"], "longitude": city["longitude"],
                       "current": "temperature_2m", "hourly": "temperature_2m,weather_code,is_day",
                       "forecast_days": 3, "timezone": "auto", "timeformat": "unixtime", "temperature_unit": "celsius"})
    try:
        with urlopen(f"https://api.open-meteo.com/v1/forecast?{query}", timeout=12) as response:
            data = normalize_forecast(json.load(response))
    except (URLError, OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError) as exc:
        raise WeatherUnavailable("Прогноз недоступен. Попробуйте обновить его ещё раз.") from exc
    return {**data, "city": city, "source": {"name": "Open-Meteo", "url": "https://open-meteo.com/"}}


def location_params(query):
    params = parse_qs(query, keep_blank_values=True)
    if any(len(values) != 1 for values in params.values()):
        raise ValueError("Укажите один город без повторных параметров.")
    if set(params) == {"city"}:
        return {"city_id": params["city"][0]}
    if set(params) == {"latitude", "longitude", "name"}:
        return {key: value[0] for key, value in params.items()}
    raise ValueError("Выберите город из списка или результатов поиска.")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        if urlsplit(self.path).path != "/api/evidence":
            super().log_message(format, *args)

    def do_GET(self):
        path = urlsplit(self.path)
        if path.path == "/api/health":
            self.send_json({"status": "ok"})
        elif path.path == "/api/evidence":
            self.send_json({"skill": read_json("skill.json"), "mcp": read_json("mcp.json"),
                            "checks": read_json("checks.json"), "hook_history": history(),
                            "hook_demo": read_json("hook-demo.json")})
        elif path.path == "/api/cities":
            self.send_json({"cities": [{"id": key, "name": value[0], "latitude": value[1], "longitude": value[2]} for key, value in CITIES.items()]})
        elif path.path == "/api/search":
            values = parse_qs(path.query).get("q", [])
            try:
                if len(values) != 1:
                    raise ValueError("Укажите один поисковый запрос.")
                self.send_json(search_cities(values[0]))
            except ValueError as exc:
                self.send_json({"error": str(exc)}, 400)
            except WeatherUnavailable as exc:
                self.send_json({"error": str(exc)}, 502)
        elif path.path in ("/api/weather", "/api/forecast"):
            try:
                fetch = fetch_forecast if path.path == "/api/forecast" else fetch_weather
                data = fetch(**location_params(path.query))
                self.send_json(data)
            except ValueError as exc:
                self.send_json({"error": str(exc)}, 400)
            except WeatherUnavailable as exc:
                self.send_json({"error": str(exc)}, 502)
        elif path.path.startswith("/api/"):
            self.send_json({"error": "Неизвестный адрес API."}, 404)
        elif path.path in ("/", "/index.html", "/app.js", "/weather-state.js", "/scene.js", "/favorites.js", "/style.css", "/tools.html", "/tools.js", "/favicon.svg") or self.is_media(path.path):
            super().do_GET()
        else:
            self.send_error(404)

    @staticmethod
    def is_media(path):
        names = ("spring", "summer", "autumn", "winter", "rain", "night")
        return path in {f"/media/{name}.{extension}" for name in names for extension in ("mp4", "webm", "jpg")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8055)
    parser.add_argument("--no-watch", action="store_true", help="Отключить file-change checks для автоматизированного запуска")
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        watcher = EditWatcher()
        if not args.no_watch:
            watcher.start()
        print(f"Погода: http://127.0.0.1:{args.port}", flush=True)
        print(f"Post-edit hook: {'выключен' if args.no_watch else 'включён'}. Демонстрация: /tools.html", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            if not args.no_watch:
                watcher.stop()
