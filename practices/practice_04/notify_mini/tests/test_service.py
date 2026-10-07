import unittest

from service import SubscriptionStore


class SubscribeTests(unittest.TestCase):
    def test_subscribe_once(self) -> None:
        store = SubscriptionStore()
        self.assertTrue(store.subscribe(" Alice "))
        self.assertFalse(store.subscribe("Alice"))

    def test_invalid_name(self) -> None:
        store = SubscriptionStore()
        for name in ("", "  ", None, 3):
            with self.subTest(name=name), self.assertRaises(ValueError):
                store.subscribe(name)


class UnsubscribeTests(unittest.TestCase):
    def test_remove_existing_name_once(self) -> None:
        store = SubscriptionStore()
        store.subscribe(" Alice ")
        self.assertTrue(store.unsubscribe("Alice "))
        self.assertFalse(store.unsubscribe("Alice"))
        self.assertTrue(store.subscribe("Alice"))

    def test_unknown_name_does_not_remove_others(self) -> None:
        store = SubscriptionStore()
        store.subscribe("Bob")
        self.assertFalse(store.unsubscribe("Alice"))
        self.assertFalse(store.subscribe("Bob"))

    def test_invalid_name_keeps_state(self) -> None:
        store = SubscriptionStore()
        store.subscribe("Bob")
        for name in ("", "  ", None, 3):
            with self.subTest(name=name), self.assertRaises(ValueError):
                store.unsubscribe(name)
        self.assertTrue(store.unsubscribe("Bob"))
