# Демонстрация проекта

Все команды выполняются из `practices/practice_05/weather`.
Нужны Python 3.12, Node.js и интернет только для реальной погоды.

## Сайт и результаты инструментов

```bash
python3 server.py
```

- Погода: http://127.0.0.1:8055
- Результаты инструментов: http://127.0.0.1:8055/tools.html

Сервер запускает post-edit watcher. Изменения Python, JavaScript, HTML, CSS,
тестов, скриптов и skill автоматически вызывают `scripts/check.sh`.
На странице демонстрации отображаются статус, событие и фактический вывод.
Проверки при старте сервера помечаются `server-start`, после правки — `file-change`.
Обработка нескольких сохранений объединяется небольшой задержкой.
`.runtime` и отчёты не отслеживаются watcher: проверка не запускает сама себя.

Сервер нужно перезапустить после изменения Python-кода: watcher проверяет код,
но не перезагружает работающий процесс приложения. Страницу обновляйте Ctrl+Shift+R.

## Skill

В Codex, открытом в папке проекта: `$weather-state-check`.
При отсутствии автоматического обнаружения поручение:
«Прочитай `.agents/skills/weather-state-check/SKILL.md` и выполни процедуру».

Воспроизводимый запуск скрипта skill:

```bash
node .agents/skills/weather-state-check/scripts/check.cjs
```

Покажите независимые ожидания в `references/cases.json`, фактический результат
в `.runtime/skill.json` и карточку Skill на странице демонстрации.
Формат skill дополнительно проверен валидатором `skill-creator`.

## MCP

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/demo_mcp.py
```

Демонстрационный клиент запускает отдельный MCP-процесс через stdio:
`initialize` → `notifications/initialized` → `tools/list` → ошибочный `get_weather`
→ `search_city` для Выборга → корректный `get_weather` по найденным координатам.
В `.runtime/mcp.json` сохраняется полный обмен сообщениями с ответом источника.
Сопоставьте координаты и время данных с сайтом; при разном времени запроса
погода может обновиться. Ошибочная широта 999 должна вернуть `isError: true`.

Конфигурация Codex сохранена в `.codex/config.toml`. Для штатных MCP tools откройте
новый Codex-сеанс из папки проекта и проверьте `/mcp`.
В текущем сеансе MCP проверен реальным stdio-клиентом из shell-инструмента;
динамическое подключение к списку штатных tools текущего диалога не подтверждалось.
Глобальная команда `codex mcp add` не использовалась.

## Хук: FAIL → PASS

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/demo_hook.py
```

Скрипт запускает тот же watcher, что и сайт, и создаёт временный тест внутри
`tests/`. После обнаружения изменения хук сам вызывает runner и получает FAIL.
Затем скрипт исправляет тест, а следующий файловый event вызывает PASS.
Временный тест удаляется, сохраняется `.runtime/hook-demo.json`.
Ни один переход FAIL/PASS не подставляется вручную.

Для наблюдения в реальном времени держите открытой `/tools.html`.
История хранится в `.runtime/hook-history.jsonl`; краткая запись демонстрации
сохраняется отдельно, поэтому не пропадает после новых запусков.
Агент получает результат чтением `/api/evidence` или `.runtime/checks.json`.

Штатный обработчик **Codex PostToolUse** также подготовлен:
`.codex/hooks.json` → `scripts/post_edit.py` → тот же runner.
Он передаёт результат агенту через `additionalContext`. Этот канал требует
загрузки проекта и доверия точному определению hook в `/hooks`.
Доверие в текущем сеансе не настраивалось: запись настроек вне пятой практики запрещена.
Запущенный и проверенный механизм этого этапа — локальный file-change hook.

## Материалы сдачи

```bash
PYTHONDONTWRITEBYTECODE=1 python3 scripts/export_evidence.py
```

Команда копирует фактические результаты из `.runtime` в `evidence`.
Снимки — история проверок, а не актуальная погода. Повторная демонстрация
обновляет runtime-данные; снимки обновляются только отдельным экспортом.

Источники реализации:
- [Codex hooks](https://learn.chatgpt.com/docs/hooks)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [MCP stdio](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [MCP tools](https://modelcontextprotocol.io/specification/2025-03-26/server/tools)
