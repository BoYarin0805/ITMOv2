# Короткое демо защиты

Я показываю практику 5 в следующем порядке (5–7 минут).

1. Запускаю `python3 server.py`, открываю http://127.0.0.1:8055.
   Показываю текущие условия, поиск и источник времени.
2. Открываю ближайшие 24 часа, выбираю час: метка «Прогноз», время с offset,
   пейзаж меняется, текущая температура остаётся. «Сейчас» возвращает live.
3. Показываю `openspec/changes/archive/2026-10-29-hourly-forecast/`:
   proposal → spec → design → tasks. Затем main spec и результат CLI archive.
4. Открываю `evidence/openspec-customization/`: before, fresh instructions с правилом,
   diff, after, отрисованную Mermaid-диаграмму. Правило остаётся в config.yaml.
5. Показываю ДЗ Spec Kit: UI/logic до и после, contract.md. Добавляю избранный город,
   перезагружаю, выбираю и удаляю; показываю тест запрета storage и предупреждение.
6. Показываю `make test`, результаты 8 браузерных сценариев и live-api.json.
7. Переключаю демопогоду, сезон и паузу. Футажи иллюстративные, числа live не меняются.
   Завершаю сравнением OpenSpec/Spec Kit и своей рефлексией.

Повтор проверки: `make test`; `make browser` после `make install-tools`.
OpenSpec: `sh scripts/openspec.sh list --specs`, `make openspec-check`.
В active changes остаётся только учебный draft настройки, не незавершённый прогноз.
