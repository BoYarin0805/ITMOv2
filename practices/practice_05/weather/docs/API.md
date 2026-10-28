# HTTP API

`GET /api/cities`, `/api/search?q=...` — готовые города и поиск.
`GET /api/weather?city=spb` — текущие условия.
`GET /api/forecast?city=spb` — 24 ближайших полных часа прогноза.
Вместо city разрешены ровно `latitude`, `longitude`, `name` выбранного результата.
Неизвестные/повторные параметры: 400; отказ или некорректный ответ источника: 502.

Прогноз: `{city, timezone, updated, units, hours, source}`. Каждая запись hours:
`{timestamp, time, temperature_2m, weather_code, is_day}`. `timestamp` — Unix seconds,
`time` — местная ISO-строка с offset, `updated` — время текущих условий источника.
Температура в °C; шаг в абсолютном времени 3600 секунд. Переходы DST сохраняются.
Текущие условия загружаются независимо от прогноза.

`GET /api/evidence` — результаты инструментов. Запросы этой страницы не засоряют лог.
`GET /api/health` — состояние сервера.
