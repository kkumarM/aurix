#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT/logs"
PID_DIR="$ROOT/.pids"
BACK_PID="$PID_DIR/sim-api.pid"
WEB_PID="$PID_DIR/web-dev.pid"

mkdir -p "$LOG_DIR" "$PID_DIR"

already_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$pid" && -d "/proc/$pid" ]]; then
      return 0
    fi
  fi
  return 1
}

if already_running "$BACK_PID"; then
  echo "sim-api already running (pid $(cat "$BACK_PID"))."
else
  echo "Building sim-api..."
  go build -o "$ROOT/bin/sim-api" ./cmd/sim-api
  echo "Starting sim-api..."
  nohup "$ROOT/bin/sim-api" >"$LOG_DIR/sim-api.log" 2>&1 &
  echo $! >"$BACK_PID"
  echo "sim-api started (pid $(cat "$BACK_PID")). Logs: $LOG_DIR/sim-api.log"
fi

if already_running "$WEB_PID"; then
  echo "web dev server already running (pid $(cat "$WEB_PID"))."
else
  echo "Starting web dev server..."
  (
    cd "$ROOT/web"
    if [[ ! -d node_modules ]]; then
      npm install
    fi
    nohup npm run dev -- --host --port 5173 >"$LOG_DIR/web-dev.log" 2>&1 &
    echo $! >"$WEB_PID"
  )
  echo "web dev server started (pid $(cat "$WEB_PID")). Logs: $LOG_DIR/web-dev.log"
fi

echo "Aurix dev environment is up. Backend :8080, Web :5173."
