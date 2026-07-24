#!/usr/bin/env bash
set -euo pipefail
# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
if [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
else
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD
fi
unset demo_credentials_email demo_credentials_password demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; API_DIR="$PROJECT_DIR/backend"; UI_DIR="$PROJECT_DIR/frontend"; MIGRATION="$API_DIR/migrations/001_governed_rag.sql"
set -a
source "$PROJECT_DIR/.env"
set +a
value(){ local key="$1" current="${!1:-}"; if [[ -n "$current" ]]; then printf '%s' "$current"; else awk -F= -v key="$key" '$1==key{sub(/^[^=]*=/,"");gsub(/^[\047\"]|[\047\"]$/,"");print;exit}' "$PROJECT_DIR/.env"; fi; }
secret(){ local current="${SECRET_KEY:-}"; if [[ "$current" =~ ^.{32,}$ && ! "$current" =~ changeme|secret-key ]]; then printf '%s' "$current"; return; fi; current="${JWT_SECRET:-$(value JWT_SECRET)}"; printf '%s' "$current"; }
check(){ command -v python3 >/dev/null && command -v npm >/dev/null || { echo 'python3 and npm are required' >&2; return 1; }; [[ -f "$PROJECT_DIR/.env" ]] || { echo 'Copy .env.example to .env and configure it' >&2; return 1; }; [[ "$(secret)" =~ ^.{32,}$ ]] || { echo 'SECRET_KEY must contain at least 32 characters' >&2; return 1; }; [[ "$(value GOVERNANCE_TENANT_ID)" =~ ^[A-Za-z0-9._:-]{3,128}$ ]] || { echo 'GOVERNANCE_TENANT_ID is required' >&2; return 1; }; [[ -n "$(value DATABASE_URL)" && "$(value DATABASE_URL)" != *postgres:postgres* ]] || { echo 'DATABASE_URL is required and must not use placeholder credentials' >&2; return 1; }; echo 'Configuration checks passed'; }
migrate(){ check; [[ "${ALLOW_SCHEMA_MIGRATION:-$(value ALLOW_SCHEMA_MIGRATION)}" == 1 ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1 for the explicit migrate command' >&2; return 1; }; command -v psql >/dev/null || { echo 'psql is required for migrations' >&2; return 1; }; psql "$(value DATABASE_URL)" -v ON_ERROR_STOP=1 -f "$MIGRATION"; }
start_services(){
  check
  local uvicorn_bin="$API_DIR/.venv/bin/uvicorn" api_ready=0
  [[ -x "$uvicorn_bin" ]] || uvicorn_bin="$API_DIR/venv/bin/uvicorn"
  [[ -x "$uvicorn_bin" && -d "$UI_DIR/node_modules" ]] || { echo 'Create backend/.venv or backend/venv and install frontend dependencies explicitly first' >&2; return 1; }
  SECRET_KEY="$(secret)" "$uvicorn_bin" main:app --app-dir "$API_DIR" --host 127.0.0.1 --port "${BACKEND_PORT:-8000}"& api_pid=$!
  trap 'kill "$api_pid" "${ui_pid:-}" 2>/dev/null || true' EXIT INT TERM
  for _ in {1..320}; do
    curl -fsS "http://127.0.0.1:${BACKEND_PORT:-8000}/api/health" >/dev/null 2>&1 && { api_ready=1; break; }
    kill -0 "$api_pid" 2>/dev/null || { wait "$api_pid"; return; }
    sleep 0.25
  done
  [[ "$api_ready" == 1 ]] || { echo 'Backend did not become ready' >&2; return 1; }
  (cd "$UI_DIR" && npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT:-3056}")& ui_pid=$!
  wait "$api_pid" "$ui_pid"
}
case "${1:-start}" in check) check;; migrate) migrate;; start) start_services;; *) echo 'Usage: ./start.sh {check|migrate|start}' >&2; exit 2;; esac
