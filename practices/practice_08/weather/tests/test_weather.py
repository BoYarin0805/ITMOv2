import io
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import urlopen
from unittest.mock import patch

import server


def provider_data():
    return {
        "timezone": "Europe/Moscow",
        "current": {"time": "2026-10-26T12:15", "temperature_2m": 4.2,
                    "apparent_temperature": 1.0, "relative_humidity_2m": 80,
                    "weather_code": 61, "wind_speed_10m": 3.5, "is_day": 1},
        "current_units": {key: unit for key, unit in zip(server.FIELDS, ("°C", "°C", "%", "wmo code", "m/s", ""))},
    }


class WeatherTests(unittest.TestCase):
    def test_provider_request_and_units(self):
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(provider_data()).encode())) as fetch:
            data = server.fetch_weather("spb")
        self.assertEqual(data["current"]["description"], "Дождь")
        self.assertEqual(data["current"]["temperature_2m"], 4.2)
        self.assertEqual(data["units"]["wind_speed_10m"], "m/s")
        self.assertEqual(data["timezone"], "Europe/Moscow")
        self.assertIn("wind_speed_unit=ms", fetch.call_args.args[0])
        self.assertIn("latitude=59.94", fetch.call_args.args[0])

    def test_invalid_city_does_not_contact_provider(self):
        with patch("server.urlopen") as fetch:
            with self.assertRaises(ValueError):
                server.fetch_weather("unknown")
            fetch.assert_not_called()

    def test_provider_failure_does_not_return_fake_data(self):
        with patch("server.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(server.WeatherUnavailable):
                server.fetch_weather("spb")

    def test_incomplete_or_invalid_provider_data(self):
        for value in (None, "4", float("nan")):
            data = provider_data()
            data["current"]["temperature_2m"] = value
            with self.subTest(value=value), patch("server.urlopen", return_value=io.BytesIO(json.dumps(data).encode())):
                with self.assertRaises(server.WeatherUnavailable):
                    server.fetch_weather("spb")


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.http.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()

    def test_page_and_city_list(self):
        with urlopen(self.base) as response:
            self.assertIn("Погода сейчас", response.read().decode())
        with urlopen(self.base + "/api/cities") as response:
            self.assertEqual(len(json.load(response)["cities"]), 4)
        with urlopen(self.base + "/tools.html") as response:
            self.assertIn("Демонстрация инструментов", response.read().decode())
        with urlopen(self.base + "/api/evidence") as response:
            data = json.load(response)
            self.assertIn("hook_history", data)

    def test_weather_http_contract(self):
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(provider_data()).encode())):
            with urlopen(self.base + "/api/weather?city=spb") as response:
                self.assertEqual(json.load(response)["city"]["name"], "Санкт-Петербург")

    def test_forecast_http_contract_and_independent_error(self):
        from test_forecast import fixture
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(fixture()).encode())):
            with urlopen(self.base + "/api/forecast?city=spb") as response:
                self.assertEqual(len(json.load(response)["hours"]), 24)
        with patch("server.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(HTTPError) as error:
                urlopen(self.base + "/api/forecast?city=spb")
            self.assertEqual(error.exception.code, 502)
        with self.assertRaises(HTTPError) as error:
            urlopen(self.base + "/api/forecast?city=unknown")
        self.assertEqual(error.exception.code, 400)

    def test_search_and_selected_city_http_contract(self):
        data = {"results": [{"name": "Выборг", "latitude": 60.7, "longitude": 28.75,
                            "country": "Россия", "admin1": "Ленинградская область"}]}
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(data).encode())):
            with urlopen(self.base + "/api/search?q=Vyborg") as response:
                city = json.load(response)["cities"][0]
                self.assertEqual(city["name"], "Выборг")
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(provider_data()).encode())):
            with urlopen(self.base + "/api/weather?latitude=60.7&longitude=28.75&name=Vyborg") as response:
                self.assertEqual(json.load(response)["city"]["latitude"], 60.7)

    def test_search_http_errors(self):
        for path in ("/api/search", "/api/search?q=a", "/api/search?q=a&q=b",
                     "/api/weather?latitude=nan&longitude=0&name=bad"):
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, 400)
        with patch("server.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(HTTPError) as error:
                urlopen(self.base + "/api/search?q=Vyborg")
            self.assertEqual(error.exception.code, 502)

    def test_error_responses(self):
        for path in ("/api/weather", "/api/weather?city=unknown", "/api/weather?city=spb&city=moscow"):
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, 400)
            self.assertIn("error", json.load(error.exception))
        with patch("server.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(HTTPError) as error:
                urlopen(self.base + "/api/weather?city=spb")
            self.assertEqual(error.exception.code, 502)


if __name__ == "__main__":
    unittest.main()
