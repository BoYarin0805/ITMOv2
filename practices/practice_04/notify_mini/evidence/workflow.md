# Ход работы и проверка

1. Среда и фича A зафиксированы коммитом `d17b48e`. Запуск `python3 -B .opencode/skills/notify-tdd/check_feature.py A` прошёл: 3 теста. Общий runner на этом этапе прошёл: 5 тестов.
2. Для фичи B создан отдельный worktree `/tmp/itmo-practice4-b` и ветка `practice4-feature-b` (см. `worktrees.txt`). После добавления тестов команда skill для B завершилась кодом 1: метод `list_subscribers` отсутствовал. После реализации она прошла: 3 теста; общий runner прошёл: 8 тестов.
3. Фича B зафиксирована коммитом `b752099`, затем перенесена в `practice_4` командой `git merge --ff-only practice4-feature-b`. Итоговый вывод находится в `tests.txt`.
4. OpenCode обнаружил skill `notify-tdd` (`opencode_skill.json`) и подключил MCP `notify_checks` (`opencode_mcp.txt`). `mcp_probe.json` сохраняет реальный обмен по MCP stdio: `initialize`, `tools/list`, успешный `tools/call` с `suite=all` и ответ `isError=true` при `suite=wrong`.
5. `hook_probe.json` показывает изолированный вызов обработчика `tool.execute.after` с событием `edit`: при исправных тестах он добавил в ответ инструмента `PASS`, при намеренно сломанном тесте — `FAIL` и текст ошибки. Временная копия была удалена; итоговый проект остаётся зелёным.

Выбор подключений: `AGENTS.md` задаёт контракт и границы работы, skill запускает набор тестов одной фичи, MCP делает общую проверку доступной как инструмент агента, hook сразу возвращает результат после редактирования.

6. `opencode_agent_use.json` содержит последовательность реальных вызовов `read(AGENTS.md)`, `skill(notify-tdd)` и `notify_checks_run_checks(suite=all)` с результатом `OK`. `opencode_hook_edit.json` содержит реальный вызов `edit` агентом и добавленный hook вывод `[post-edit check: PASS]` с 8 тестами. Сеансы выполнены через `practice-builder` на `opencode/mimo-v2.6-flash-free`.

7. `opencode_skill_run.json` подтверждает, что сам агент загрузил skill, через `bash` запустил его скрипт для A и B (3 + 3 теста), затем вызвал MCP для общего набора (8 тестов).
