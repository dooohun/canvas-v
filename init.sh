#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

INSTALL_CMD=(pnpm install)
# NOTE: turbo.json에 test 태스크가 아직 없다 (monorepo-setup feature에서 추가 예정).
# 추가되면 VERIFY_CMD에 "test"를 포함시킬 것.
VERIFY_CMD=(pnpm turbo run build lint check-types)
# NOTE: apps/frontend, apps/backend에 아직 dev 스크립트가 없다 (monorepo-setup feature에서 추가 예정).
# 추가되기 전까지는 아무 것도 실행되지 않는다.
START_CMD=(pnpm turbo run dev)

echo "==> Working directory: $PWD"
echo "==> Syncing dependencies"
"${INSTALL_CMD[@]}"

echo "==> Running baseline verification"
"${VERIFY_CMD[@]}"

echo "==> Startup command"
printf '   '
printf ' %q' "${START_CMD[@]}"
printf '\n'

if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "==> Starting the app"
  exec "${START_CMD[@]}"
fi

echo "Set RUN_START_COMMAND=1 if you want init.sh to launch the app directly."
