#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
node --check static/app.js
node --check static/tools.js
node --check static/favorites.js
node --check static/scene.js
node --test tests/test_state.cjs tests/test_interface.cjs tests/test_favorites.cjs tests/test_scene.cjs
