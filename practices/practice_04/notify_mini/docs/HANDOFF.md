# Передача проекта

- Фича A: `SubscriptionStore.unsubscribe` удаляет имя, различает успешную и повторную отписку, валидирует вход.
- Фича B: `SubscriptionStore.list_subscribers` возвращает отсортированную копию и фильтрует по префиксу.
- Проверка: `sh scripts/check.sh` (8 тестов); отдельные наборы запускаются через skill `notify-tdd`.
- Собственный MCP: `python3 -B scripts/probe_mcp.py` проверяет handshake, успешный и ошибочный вызов.
- OpenCode: запустить `opencode` из этой папки; по умолчанию используется проверенная бесплатная модель. Конфигурация и hook находятся здесь же. Для локального эксперимента: `ollama create notify-agent -f Modelfile`.
- История Git: коммит среды и A `d17b48e`, B в отдельном worktree `b752099`, затем fast-forward в `practice_4`.
- Итог: обе фичи проверяются общей командой sh scripts/check.sh
