#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    AI RAG Platform - Startup Script    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ============================================
# 1. Clean used ports
# ============================================
echo -e "${YELLOW}[1/6] Cleaning used ports...${NC}"

clean_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "  Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

clean_port 8050
clean_port 3056
echo -e "${GREEN}  Ports cleaned.${NC}"

wait_for_url() {
    local name=$1
    local url=$2
    local attempts=${3:-60}
    echo -e "  Waiting for $name: $url"
    for ((i=1; i<=attempts; i++)); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}  $name is ready.${NC}"
            return 0
        fi
        sleep 1
    done
    echo -e "${RED}  $name did not become ready at $url${NC}"
    return 1
}

# ============================================
# 2. Check PostgreSQL
# ============================================
echo -e "${YELLOW}[2/6] Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
    if pg_isready -q 2>/dev/null; then
        echo -e "${GREEN}  PostgreSQL is running.${NC}"
    else
        echo -e "${RED}  PostgreSQL is not running!${NC}"
        echo -e "  Please start PostgreSQL first:"
        echo -e "    macOS:  brew services start postgresql"
        echo -e "    Linux:  sudo systemctl start postgresql"
        exit 1
    fi
else
    echo -e "${YELLOW}  pg_isready not found, assuming PostgreSQL is running...${NC}"
fi

# Create database if not exists
echo -e "  Creating database 'airagplatform' if needed..."
createdb airagplatform 2>/dev/null || true

# ============================================
# 3. Check .env file
# ============================================
echo -e "${YELLOW}[3/6] Checking .env file...${NC}"

if [ ! -f ".env" ]; then
    echo -e "  Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}  Please update .env with your OPENROUTER_API_KEY${NC}"
fi
echo -e "${GREEN}  .env file ready.${NC}"

# ============================================
# 4. Setup Backend
# ============================================
echo -e "${YELLOW}[4/6] Setting up backend...${NC}"

cd "$PROJECT_DIR/backend"

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo -e "  Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo -e "  Installing Python dependencies..."
pip install -r requirements.txt -q 2>&1 | tail -1

# Create uploads directory
mkdir -p uploads

# Create tables and seed data
echo -e "  Setting up database tables and seeding data..."
python -c "from database import create_tables; create_tables()" 2>&1
python seed.py 2>&1

# Start backend with auto-reload (watches for code changes)
echo -e "${GREEN}  Starting backend on port 8050 with auto-reload...${NC}"
uvicorn main:app --reload --host 0.0.0.0 --port 8050 &
BACKEND_PID=$!
cd "$PROJECT_DIR"

wait_for_url "Backend" "http://localhost:8050/api/health" 90 || {
    echo -e "${RED}  Backend failed to start. Stop and inspect the log above.${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
}

# ============================================
# 5. Setup Frontend
# ============================================
echo -e "${YELLOW}[5/6] Setting up frontend...${NC}"

cd "$PROJECT_DIR/frontend"

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo -e "  Installing npm dependencies..."
    npm install 2>&1 | tail -3
else
    echo -e "  npm dependencies already installed."
fi

# Start frontend with hot module replacement (watches for code changes)
echo -e "${GREEN}  Starting frontend on port 3056 with hot reload...${NC}"
npm run dev &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

wait_for_url "Frontend" "http://localhost:3056" 60 || {
    echo -e "${RED}  Frontend failed to start. Stop and inspect the log above.${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 1
}

# ============================================
# 6. Ready!
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    AI RAG Platform is running!         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  Frontend:  ${BLUE}http://localhost:3056${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:8050${NC}"
echo -e "  API Docs:  ${BLUE}http://localhost:8050/docs${NC}"
echo ""
echo -e "  Demo Login: ${YELLOW}demo@airag.com${NC} / ${YELLOW}demo123${NC}"
echo ""
echo -e "  Both servers auto-reload on code changes."
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services."
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Clean up any remaining processes on the ports
    clean_port 8050
    clean_port 3056
    echo -e "${RED}Services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for any background process to exit
wait
