"""Хранилище подписчиков в памяти."""


class SubscriptionStore:
    def __init__(self) -> None:
        self._subscribers: set[str] = set()

    def subscribe(self, name: str) -> bool:
        """Добавить имя; вернуть False, если оно уже было."""
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name must be a non-empty string")
        normalized = name.strip()
        if normalized in self._subscribers:
            return False
        self._subscribers.add(normalized)
        return True

    def unsubscribe(self, name: str) -> bool:
        """Удалить имя; вернуть False, если подписчик отсутствует."""
        if not isinstance(name, str) or not name.strip():
            raise ValueError("name must be a non-empty string")
        normalized = name.strip()
        if normalized not in self._subscribers:
            return False
        self._subscribers.remove(normalized)
        return True
