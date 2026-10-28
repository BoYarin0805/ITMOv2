# Data model

Envelope: version (integer, только 1), cities (array, max 5).
FavoriteCity: id (canonical coordinates string), name (trimmed string 1..200),
latitude (finite number -90..90), longitude (finite number -180..180).
ID определяется как в contract.md. Уникальность по id, порядок добавления.

Состояния: persisted → session-only при ошибке get/set; session-only → persisted
при следующей успешной записи по явному действию. Чтение повреждения возвращает
предупреждение, сохраняет корректные записи и не выполняет миграцию с записью.
