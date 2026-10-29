"""Regression tests for the vulnerabilities reproduced in evidence/before.

Run this file against the original service to see the failures, then against the
fixed service to verify the controls.  Every check talks to the real Shop
dispatcher and only uses the synthetic fixture data.
"""

import unittest

from service import Shop


class SecurityRegressionTest(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def request(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, result = self.request("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": result["token"]}

    def json_text(self, value):
        import json
        return json.dumps(value, ensure_ascii=False)

    # --- authentication and authorization ---------------------------------

    def test_profile_requires_a_session(self):
        self.assertEqual(self.request("GET", "/profile?id=1")[0], 401)
        self.assertEqual(self.request("GET", "/orders")[0], 401)

    def test_sql_injection_cannot_return_other_profiles(self):
        auth = self.login()
        for path in ("/profile?id=1%20OR%201=1", "/profile?id=not-a-number"):
            with self.subTest(path=path):
                status, result = self.request("GET", path, headers=auth)
                self.assertIn(status, (200, 400))
                self.assertNotIn("TEST_BOB", self.json_text(result))
        status, result = self.request("GET", "/search?q=%27%20OR%201=1%20--", headers=auth)
        self.assertIn(status, (200, 403))
        self.assertNotIn("TEST_BOB", self.json_text(result))

    def test_customer_sees_only_own_orders(self):
        status, orders = self.request("GET", "/orders", headers=self.login())
        self.assertEqual(status, 200)
        self.assertTrue(orders)
        self.assertTrue(all(order["owner"] == 1 for order in orders))

    def test_customer_cannot_use_role_header_for_admin_export(self):
        auth = {**self.login(), "X-Role": "staff"}
        self.assertEqual(self.request("GET", "/admin/export", headers=auth)[0], 403)
        staff = {**self.login("staff", "learn-staff"), "X-Role": "customer"}
        self.assertEqual(self.request("GET", "/admin/export", headers=staff)[0], 200)

    def test_files_are_scoped_to_the_session_owner(self):
        auth = self.login()
        self.assertEqual(self.request("GET", "/files?user=bob&path=receipt.txt", headers=auth)[0], 403)
        self.assertEqual(
            self.request("GET", "/files?user=..%2Fprivate&path=operator-note.txt", headers=auth)[0],
            403,
        )
        status, result = self.request("GET", "/files?user=alice&path=receipt.txt", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", result["content"])

    def test_price_comes_from_the_catalog(self):
        status, order = self.request(
            "POST", "/orders", {"product": "chair", "price": 1}, self.login())
        self.assertEqual(status, 201)
        self.assertEqual(order["price"], 5000)

    # --- logging, rendering and error handling ----------------------------

    def test_debug_logs_are_staff_only_and_redacted(self):
        self.assertEqual(self.request("GET", "/debug/logs")[0], 401)
        self.assertEqual(self.request("GET", "/debug/logs", headers=self.login())[0], 403)
        status, logs = self.request("GET", "/debug/logs", headers=self.login("staff", "learn-staff"))
        self.assertEqual(status, 200)
        text = self.json_text(logs).lower()
        for secret in ("learn-alice", "learn-bob", "x-token", "password"):
            self.assertNotIn(secret, text)

    def test_reviews_require_a_valid_authenticated_payload(self):
        self.assertEqual(
            self.request("POST", "/reviews", {"product": "chair", "text": "hello"})[0], 401)
        auth = self.login()
        self.assertEqual(
            self.request("POST", "/reviews", {"product": "unknown", "text": "hello"}, auth)[0], 400)
        self.assertEqual(
            self.request("POST", "/reviews", {"product": "chair", "text": "x" * 2001}, auth)[0], 400)

    def test_review_html_is_escaped(self):
        auth = self.login()
        payload = "<script>alert('xss')</script>"
        self.request("POST", "/reviews", {"product": "chair", "text": payload}, auth)
        status, html = self.request("GET", "/reviews/view")
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_internal_errors_are_not_exposed(self):
        status, result = self.request("GET", "/profile?id=not-a-number", headers=self.login())
        self.assertEqual(status, 400)
        text = self.json_text(result)
        self.assertNotIn("OperationalError", text)
        self.assertNotIn("no such column", text)

    # --- assistant boundary ------------------------------------------------

    def test_assistant_context_is_owner_scoped(self):
        auth = self.login()
        self.assertEqual(self.request("GET", "/assistant/context?order_id=2", headers=auth)[0], 403)
        status, result = self.request("GET", "/assistant/context?order_id=1", headers=auth)
        self.assertEqual(status, 200)
        self.assertIn("chair", result["prompt"])
        self.assertNotIn("lamp", result["prompt"])

    def test_assistant_tools_enforce_server_side_authorization(self):
        auth = self.login()
        cases = [
            {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}},
            {"tool": "read_file", "arguments": {"path": "../private/operator-note.txt"}},
            {"tool": "export_profiles", "arguments": {}},
            {"tool": "delete_tree", "arguments": {"path": "files/alice"}},
        ]
        for decision in cases:
            with self.subTest(tool=decision["tool"], arguments=decision["arguments"]):
                status, _ = self.request("POST", "/assistant/execute", {"decision": decision}, auth)
                self.assertIn(status, (400, 403))
        status, result = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "read_file", "arguments": {"path": "files/alice/receipt.txt"}}
        }, auth)
        self.assertEqual(status, 200)
        self.assertIn("TEST_ALICE", result["content"])

    def test_staff_can_export_through_the_assistant(self):
        status, result = self.request("POST", "/assistant/execute", {
            "decision": {"tool": "export_profiles", "arguments": {}}
        }, self.login("staff", "learn-staff"))
        self.assertEqual(status, 200)
        self.assertEqual(len(result), 2)


if __name__ == "__main__":
    unittest.main()
