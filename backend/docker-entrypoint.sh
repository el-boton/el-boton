#!/bin/sh
set -eu

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  /app/bin/migrate
fi

exec /app/bin/server
