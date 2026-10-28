#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
task_root=$(pwd)
mkdir -p .runtime/tmp .tooling/browsers
export TMPDIR="$task_root/.runtime/tmp"
npm --cache .tooling/npm-cache ci --ignore-scripts --no-audit --no-fund
PLAYWRIGHT_BROWSERS_PATH="$task_root/.tooling/browsers" node_modules/.bin/playwright install chromium
