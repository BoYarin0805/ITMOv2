# Notify Mini

Небольшой сервис подписчиков для практики 4. Фича A — отписка, фича B — просмотр подписчиков по префиксу. Обе фичи проверяются стандартным `unittest`, внешние Python-пакеты не нужны.

## Запуск

Из этой папки:

```sh
sh scripts/check.sh
python3 -B scripts/probe_mcp.py
opencode
```

Для рабочего сценария нужен интернет: `opencode.json` по умолчанию выбирает проверенную бесплатную модель `opencode/mimo-v2.6-flash-free`, подключает MCP `notify_checks` и подхватывает skill и hook из `.opencode/`. Для экспериментов с локальным вариантом можно создать алиас `ollama create notify-agent -f Modelfile` и выбрать `--model ollama/notify-agent`; в длинном агентном сеансе эта модель пока выдаёт некорректный текст.

## Артефакты

Правила агента — `AGENTS.md`; контракт — `docs/requirements.md`; стиль — `docs/style-guide.md`; skill — `.opencode/skills/notify-tdd`; MCP — `mcp/server.py`; автоматическая проверка после правки — `.opencode/plugins/check-after-edit.js` и `scripts/check.sh`. Подтверждения запусков лежат в `evidence/`, передача — `docs/HANDOFF.md`, рефлексия — в соседнем `reflection.md`.
