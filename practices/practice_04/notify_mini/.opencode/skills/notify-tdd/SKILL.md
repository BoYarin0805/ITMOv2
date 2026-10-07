---
name: notify-tdd
description: Проверка фич A и B сервиса Notify Mini отдельными наборами тестов перед общей проверкой.
---

# Проверка фичи

Прочитай `docs/requirements.md`. Для фичи A запусти `python3 .opencode/skills/notify-tdd/check_feature.py A`, для фичи B — ту же команду с `B`. Скрипт запускает нужный класс тестов и возвращает код ошибки при провале. После исправления запусти общий runner `sh scripts/check.sh`. Сообщай результат по фактическому выводу команд.
