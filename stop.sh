#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT/.pids"
BACK_PID="$PID_DIR/sim-api.pid"
WEB_PID="$PID_DIR/web-dev.pid"

stop_one() {
  local name="$1" pid_file="$2"
  if [[ ! -f "$pid_file" ]]; then
    echo "$name not running."
    return
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" || ! -d "/proc/$pid" ]]; then
    echo "$name pid file stale; removing."
    rm -f "$pid_file"
    return
  fi
  echo "Stopping $name (pid $pid)..."
  kill "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

stop_one "sim-api" "$BACK_PID"
stop_one "web dev server" "$WEB_PID"
echo "Done."
