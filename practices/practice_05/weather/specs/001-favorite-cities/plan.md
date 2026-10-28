# Implementation Plan: Избранные города

Branch/catalog: 001-favorite-cities. Date: 2026-10-29.

## Summary
Чистый browser storage module + UI над общим selectedLocation. Контракт UI и логики
согласован в contract.md; новых HTTP endpoints и зависимостей не требуется.

## Technical Context
Language: ES2020 JavaScript. Storage: localStorage. Tests: node:test + Playwright.
Platform: современные desktop/mobile браузеры. Files: static/favorites.js, app.js,
index.html; tests/test_favorites.cjs и tests/browser/weather.spec.js.

## Constitution Check
Требования до кода — PASS; runtime без пакетов — PASS; независимость API/storage — PASS;
разделение live/forecast/demo — PASS; область записей — папка practice_05.

## Project Structure
Модуль экспортирует нормализацию и store с list/add/remove. UI не формирует JSON
хранилища самостоятельно. Избранный город проходит тот же загрузчик, что поисковый.

## Phase 0
Решения и альтернативы: research.md. Неопределённых контрактных вопросов не осталось.

## Phase 1
Модель: data-model.md. Формат: contracts/storage.json. Проверка: quickstart.md.
Глобальный agent context не обновляется: применяются локальные AGENTS.md и constitution.
