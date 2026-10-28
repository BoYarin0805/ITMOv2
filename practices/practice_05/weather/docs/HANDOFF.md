# Состояние проекта

Завершена практика 5: прогноз через OpenSpec, Mermaid-правило до/после,
избранное через GitHub Spec Kit с двумя спецификациями и общим контрактом,
видеопейзажи и проверки. Главный отчёт — REPORT.md, демо — DEFENSE.md.

Запуск из weather: `python3 server.py` → http://127.0.0.1:8055.
`make test`: 29 Python + 10 JS. `make browser`: 8 Chromium-сценариев.
Runtime без сторонних пакетов, Node.js нужен для автоматических проверок.
Локальные dev-tools: `make install-tools`. Сеть нужна для реальной погоды.

Архив OpenSpec: `2026-10-29-hourly-forecast`; main spec синхронизирован.
Active `weather-alerts-draft` — намеренно не реализованный учебный пример настройки.
Spec Kit feature `specs/001-favorite-cities`, все задачи выполнены.

Все записи исходников/инструментов ограничены practice_05; пользователь разрешил
также Git commit/push. Корневой opencode.json — чужая локальная правка, не включать.
Глобальные настройки, другие практики и учётные данные не менять.

Реальная погода, прогноз и демо разделены. Футажи иллюстративные, источники ASSETS.md.
Browser fixtures и live-api.json имеют разные назначения; снимки не текущая погода.
Skill/MCP/file-change hook сохранены; нативный PostToolUse не активировался глобально.
