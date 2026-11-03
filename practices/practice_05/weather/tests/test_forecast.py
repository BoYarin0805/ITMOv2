import io
import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import server
from forecast import normalize_forecast


def fixture(start="2026-10-29T00:00:00+00:00", now=12 * 3600 + 900, zone="Europe/Moscow"):
    stamp = int(datetime.fromisoformat(start).timestamp())
    return {"timezone": zone, "current": {"time": stamp + now},
            "hourly_units": {"temperature_2m": "°C"},
            "hourly": {"time": [stamp + i * 3600 for i in range(72)],
                       "temperature_2m": list(range(72)), "weather_code": [3] * 72, "is_day": [1] * 72}}


class ForecastTests(unittest.TestCase):
    def test_round_up_and_local_timezone(self):
        data = normalize_forecast(fixture())
        self.assertEqual(len(data["hours"]), 24)
        self.assertEqual(data["hours"][0]["time"], "2026-10-29T16:00+03:00")
        self.assertEqual(data["hours"][-1]["temperature_2m"], 36)

    def test_exact_hour_is_included(self):
        self.assertEqual(normalize_forecast(fixture(now=0))["hours"][0]["temperature_2m"], 0)

    def test_midnight_boundary(self):
        data = normalize_forecast(fixture(now=20 * 3600 + 900))
        self.assertEqual(data["hours"][0]["time"], "2026-10-30T00:00+03:00")

    def test_dst_repeated_hour_preserves_offset(self):
        data = normalize_forecast(fixture(start="2026-10-25T00:00:00+00:00", now=0, zone="Europe/Berlin"))
        a, b = data["hours"][:2]
        self.assertEqual(a["time"], "2026-10-25T02:00+02:00")
        self.assertEqual(b["time"], "2026-10-25T02:00+01:00")
        self.assertEqual(b["timestamp"] - a["timestamp"], 3600)

    def test_invalid_source_is_not_filled_with_zeroes(self):
        cases = [lambda d: d["hourly"]["time"].pop(),
                 lambda d: d["hourly"]["temperature_2m"].__setitem__(15, None),
                 lambda d: d["hourly"]["weather_code"].__setitem__(15, True),
                 lambda d: d["hourly"]["weather_code"].__setitem__(15, 1.5),
                 lambda d: d["hourly"]["time"].__setitem__(15, 0),
                 lambda d: d["current"].__setitem__("time", float("nan")),
                 lambda d: d["current"].__setitem__("time", d["hourly"]["time"][-2])]
        for change in cases:
            data = fixture()
            change(data)
            with self.subTest(change=change), self.assertRaises((ValueError, KeyError, TypeError)):
                normalize_forecast(data)

    def test_unknown_integer_code_remains_visible(self):
        data = fixture()
        data["hourly"]["weather_code"][13] = 999
        self.assertEqual(normalize_forecast(data)["hours"][0]["weather_code"], 999)

    def test_fetch_contract(self):
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(fixture()).encode())) as fetch:
            data = server.fetch_forecast("spb")
        self.assertEqual(data["city"]["name"], "Санкт-Петербург")
        self.assertIn("timeformat=unixtime", fetch.call_args.args[0])

    def test_invalid_city_before_network(self):
        with patch("server.urlopen") as fetch:
            with self.assertRaises(ValueError):
                server.fetch_forecast("missing")
            fetch.assert_not_called()
