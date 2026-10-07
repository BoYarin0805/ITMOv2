"""Хранилище подписчиков в памяти."""


class SubscriptionStore:
    def __init__(self) -> None:
        self._subscribers: set[str] = set()

    def _normalize_name(self, name: str) -> str:
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name must be a non-empty string")
        return name.strip()

    def subscribe(self, name: str) -> bool:
        """Добавить имя; вернуть False, если оно уже было."""
        normalized = self._normalize_name(name)
        if normalized in self._subscribers:
            return False
        self._subscribers.add(normalized)
        return True

    def unsubscribe(self, name: str) -> bool:
        """Удалить имя; вернуть False, если подписчик отсутствует."""
        normalized = self._normalize_name(name)
        if normalized not in self._subscribers:
            return False
        self._subscribers.remove(normalized)
        return True

    def list_subscribers(self, prefix: str = "") -> list[str]:
        """Вернуть отсортированную копию имён, отфильтрованную по префиксу."""
        if not isinstance(prefix, str):
            raise ValueError("prefix must be a string")
        normalized = prefix.strip()
        return sorted(name for name in self._subscribers if name.startswith(normalized))
