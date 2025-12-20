#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1) Backend (Nest / Node)
cd "$ROOT_DIR/backend-node"
npm install
nohup npm run start:dev > "$ROOT_DIR/backend-node.log" 2>&1 &

# 2) Frontend (Vite)
cd "$ROOT_DIR/frontend"
npm install
nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$ROOT_DIR/frontend.log" 2>&1 &

echo "✅ backend-node: http://localhost:3000"
echo "✅ swagger:      http://localhost:3000/api"
echo "✅ frontend:     http://localhost:5173"
echo "logs:"
echo " - $ROOT_DIR/backend-node.log"
echo " - $ROOT_DIR/frontend.log"
