#!/usr/bin/env bash
# Build con dati di esempio, avvia preview, esegue gli E2E. Uso: npm run e2e
set -euo pipefail
cd "$(dirname "$0")/../.."
CRAS_CSV=tests/fixtures/cras-esempio.csv npm run build >/dev/null
npx vite preview --port 4173 >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -sf localhost:4173/riccio/ >/dev/null && break; sleep 0.3; done
mkdir -p shots
node tests/e2e/shots.mjs index.html
node tests/e2e/cras.mjs
node tests/e2e/triage.mjs
