# Скрипты проверки

Все скрипты работают только с локальным `service.py`, `127.0.0.1` и временными
файлами стенда. Внешних запросов нет.

```bash
cd practices/practice_06

# Полный набор HTTP-атак; скрипт сам запускает service.py на свободном порту.
python3 attacks/attack_suite.py --label after

# Проверка серверной авторизации инструментов ассистента.
python3 attacks/forced_decisions.py --label after

# Регрессионные тесты (входят в make step6).
cd lab && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v test_security
```

Для воспроизведения состояния «до» нужен исходный `service.py` из
родительского коммита `0c8a9c1` (или `c7f2f6c^`), например:

```bash
mkdir -p /tmp/opencode/practice06-base
git archive c7f2f6c^ practices/practice_06/lab | tar -x -C /tmp/opencode/practice06-base
python3 attacks/attack_suite.py --label before \
  --service /tmp/opencode/practice06-base/practices/practice_06/lab/service.py
```

`attack_suite.py` пишет `evidence/<label>/attack_results.json`, `forced_decisions.py`
— `evidence/<label>/forced_decisions.json`.
