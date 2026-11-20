import io
import json
import unittest
from urllib.error import URLError
from unittest.mock import patch

import server


class SearchTests(unittest.TestCase):
    def test_disambiguation_and_localized_request(self):
        data = {"results": [
            {"name": "Париж", "latitude": 48.85, "longitude": 2.35, "country": "Франция", "admin1": "Иль-де-Франс"},
            {"name": "Париж", "latitude": 54.0, "longitude": 60.0, "country": "Россия"},
        ]}
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(data).encode())) as fetch:
            cities = server.search_cities("Париж")["cities"]
        self.assertEqual(len(cities), 2)
        self.assertEqual(cities[0]["country"], "Франция")
        self.assertEqual(cities[1]["region"], "")
        self.assertIn("language=ru", fetch.call_args.args[0])

    def test_no_matches_is_not_failure(self):
        with patch("server.urlopen", return_value=io.BytesIO(b'{}')):
            self.assertEqual(server.search_cities("zzzzz"), {"cities": []})

    def test_bad_query_does_not_request_provider(self):
        for query in ("", "   ", "a", "x" * 101):
            with self.subTest(query=query), patch("server.urlopen") as fetch:
                with self.assertRaises(ValueError):
                    server.search_cities(query)
                fetch.assert_not_called()

    def test_search_failure_or_broken_response(self):
        for response in (b'{"results": null}', b'{"results": [{}]}', b'[]', b'bad json'):
            with self.subTest(response=response), patch("server.urlopen", return_value=io.BytesIO(response)):
                with self.assertRaises(server.WeatherUnavailable):
                    server.search_cities("Москва")
        with patch("server.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(server.WeatherUnavailable):
                server.search_cities("Москва")

    def test_invalid_coordinates_rejected_before_network(self):
        for lat, lon in (("nan", 0), (91, 0), (0, -181), ("bad", 0), (0, "inf")):
            with self.subTest(lat=lat, lon=lon), patch("server.urlopen") as fetch:
                with self.assertRaises(ValueError):
                    server.fetch_weather(latitude=lat, longitude=lon, name="Город")
                fetch.assert_not_called()

    def test_selected_coordinates_used_for_weather(self):
        from test_weather import provider_data
        with patch("server.urlopen", return_value=io.BytesIO(json.dumps(provider_data()).encode())) as fetch:
            data = server.fetch_weather(latitude=48.85, longitude=2.35, name="Париж, Франция")
        self.assertEqual(data["city"]["name"], "Париж, Франция")
        self.assertIn("latitude=48.85", fetch.call_args.args[0])
        self.assertIn("longitude=2.35", fetch.call_args.args[0])
