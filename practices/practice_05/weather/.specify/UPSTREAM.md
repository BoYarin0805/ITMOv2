# GitHub Spec Kit

Использован официальный Codex/sh template release **v0.0.90**:
https://github.com/github/spec-kit/releases/tag/v0.0.90

URL архива и SHA-256: `../evidence/speckit-source.json`.
Шаблоны, bash-скрипты и Codex prompts извлечены в проект без глобальной установки.
Лицензия upstream — MIT: https://github.com/github/spec-kit/blob/v0.0.90/LICENSE

Версия закреплена для воспроизводимости классического цикла
constitution → specify → plan → tasks → implement.
Это не утверждение об использовании последней версии Spec Kit.

Скрипты выполнялись с `GIT_CEILING_DIRECTORIES` на уровне practices и
`SPECIFY_FEATURE=001-favorite-cities`, чтобы вложенный проект не создавал файлы
в корне учебного репозитория. Ветки скрипты не создавали; Git-ветка сдачи — отдельная.

В извлечённых текстовых файлах нормализованы только завершающие пробелы и пустые строки EOF. SHA-256 относится к неизменённому официальному архиву.
