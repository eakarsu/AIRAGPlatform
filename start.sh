#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; API_DIR="$PROJECT_DIR/backend"; UI_DIR="$PROJECT_DIR/frontend"; MIGRATION="$API_DIR/migrations/001_governed_rag.sql"
value(){ local key="$1" current="${!1:-}"; if [[ -n "$current" ]]; then printf '%s' "$current"; else awk -F= -v key="$key" '$1==key{sub(/^[^=]*=/,"");gsub(/^[\047\"]|[\047\"]$/,"");print;exit}' "$PROJECT_DIR/.env"; fi; }
secret(){ local current="${SECRET_KEY:-${JWT_SECRET:-}}"; if [[ -n "$current" ]]; then printf '%s' "$current"; else value SECRET_KEY; fi; }
check(){ command -v python3 >/dev/null && command -v npm >/dev/null || { echo 'python3 and npm are required' >&2; return 1; }; [[ -f "$PROJECT_DIR/.env" ]] || { echo 'Copy .env.example to .env and configure it' >&2; return 1; }; [[ "$(secret)" =~ ^.{32,}$ ]] || { echo 'SECRET_KEY must contain at least 32 characters' >&2; return 1; }; [[ "$(value GOVERNANCE_TENANT_ID)" =~ ^[A-Za-z0-9._:-]{3,128}$ ]] || { echo 'GOVERNANCE_TENANT_ID is required' >&2; return 1; }; [[ -n "$(value DATABASE_URL)" ]] || { echo 'DATABASE_URL is required' >&2; return 1; }; rg -qi 'changeme|postgres:postgres|secret-key' "$PROJECT_DIR/.env" && { echo 'Replace placeholder credentials in .env' >&2; return 1; }; echo 'Configuration checks passed'; }
migrate(){ check; [[ "${ALLOW_SCHEMA_MIGRATION:-$(value ALLOW_SCHEMA_MIGRATION)}" == 1 ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1 for the explicit migrate command' >&2; return 1; }; command -v psql >/dev/null || { echo 'psql is required for migrations' >&2; return 1; }; psql "$(value DATABASE_URL)" -v ON_ERROR_STOP=1 -f "$MIGRATION"; }
start_services(){
  check
  local uvicorn_bin="$API_DIR/.venv/bin/uvicorn" api_ready=0
  [[ -x "$uvicorn_bin" ]] || uvicorn_bin="$API_DIR/venv/bin/uvicorn"
  [[ -x "$uvicorn_bin" && -d "$UI_DIR/node_modules" ]] || { echo 'Create backend/.venv or backend/venv and install frontend dependencies explicitly first' >&2; return 1; }
  SECRET_KEY="$(secret)" "$uvicorn_bin" main:app --app-dir "$API_DIR" --host 127.0.0.1 --port "${BACKEND_PORT:-8000}"& api_pid=$!
  trap 'kill "$api_pid" "${ui_pid:-}" 2>/dev/null || true' EXIT INT TERM
  for _ in {1..80}; do
    curl -fsS "http://127.0.0.1:${BACKEND_PORT:-8000}/api/health" >/dev/null 2>&1 && { api_ready=1; break; }
    kill -0 "$api_pid" 2>/dev/null || { wait "$api_pid"; return; }
    sleep 0.25
  done
  [[ "$api_ready" == 1 ]] || { echo 'Backend did not become ready' >&2; return 1; }
  (cd "$UI_DIR" && npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT:-3056}")& ui_pid=$!
  wait "$api_pid" "$ui_pid"
}
case "${1:-check}" in check) check;; migrate) migrate;; start) start_services;; *) echo 'Usage: ./start.sh {check|migrate|start}' >&2; exit 2;; esac
