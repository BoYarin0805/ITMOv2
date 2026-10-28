"""Нормализация прогноза: абсолютные часы для DST, местные подписи для интерфейса."""
import math
from datetime import datetime
from zoneinfo import ZoneInfo


def number(value):
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def normalize_forecast(data):
    zone = ZoneInfo(data["timezone"])
    now = data["current"]["time"]
    hourly = data["hourly"]
    fields = ("time", "temperature_2m", "weather_code", "is_day")
    if not number(now):
        raise ValueError("Invalid forecast time")
    if any(not isinstance(hourly[key], list) for key in fields):
        raise ValueError("Invalid forecast arrays")
    length = len(hourly["time"])
    if not length or any(len(hourly[key]) != length for key in fields):
        raise ValueError("Mismatched forecast arrays")
    if data["hourly_units"]["temperature_2m"] != "°C":
        raise ValueError("Unexpected temperature unit")
    hours = []
    previous = None
    for stamp, temperature, code, day in zip(*(hourly[key] for key in fields)):
        if not number(stamp) or not float(stamp).is_integer():
            raise ValueError("Invalid timestamp")
        if previous is not None and stamp - previous != 3600:
            raise ValueError("Nonconsecutive forecast")
        previous = stamp
        if not number(temperature) or not number(code) or not float(code).is_integer() or code < 0:
            raise ValueError("Invalid forecast value")
        if isinstance(day, bool) or day not in (0, 1):
            raise ValueError("Invalid day/night")
        if stamp >= now:
            hours.append({"timestamp": stamp, "time": datetime.fromtimestamp(stamp, zone).isoformat(timespec="minutes"),
                          "temperature_2m": temperature, "weather_code": int(code), "is_day": day})
    if len(hours) < 24:
        raise ValueError("Not enough forecast hours")
    return {"hours": hours[:24], "timezone": data["timezone"], "units": {"temperature_2m": "°C"},
            "updated": datetime.fromtimestamp(now, zone).isoformat(timespec="minutes")}
