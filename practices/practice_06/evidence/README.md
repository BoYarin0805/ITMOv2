# Evidence index

| Путь | Что внутри |
|---|---|
| `before/attack_results.json` | 21 HTTP-наблюдение на исходном `service.py` |
| `before/forced_decisions.json` | Прямые опасные решения в `/assistant/execute` до фикса |
| `before/security_tests.txt` | 13 регрессионных тестов на исходном коде: 14 failures, 4 errors |
| `before/baseline_tests.txt` | Штатные 16 тестов исходного сервиса: OK |
| `before/assistant_context_prompt.txt` | Точный промпт с вредоносным отзывом |
| `before/planner_response*.jsonl`, `before/planner_decision*.json` | Реальные ответы `deepseek/deepseek-flash` |
| `after/attack_results.json` | Те же 21 запрос после фикса |
| `after/forced_decisions.json` | Повторные опасные решения после фикса: 403 |
| `after/security_tests.txt` | 13 тестов после фикса: OK |
| `after/make_step6.txt` | `make step6`: 29 тестов OK |
| `after/make_test.txt` | Корневой `make test`: код 0 |
| `after/assistant_context_prompt.txt` | Промпт после фикса |
| `after/planner_response*.jsonl`, `after/planner_decision*.json` | Повторные ответы модели |
| `LLM_EXPERIMENT.md` | Сводка LLM-эксперимента и честные ограничения |

Все данные получены на локальном процессе `127.0.0.1` с синтетическими
`TEST_*`; внешние сервисы не использовались.
