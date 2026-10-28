#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export OPENSPEC_TELEMETRY=0
exec node node_modules/@fission-ai/openspec/bin/openspec.js "$@"
