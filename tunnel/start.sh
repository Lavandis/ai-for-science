#!/bin/bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$PROJECT_ROOT/.venv/bin/python"
SERVER="root@154.64.255.149"

echo "▶ 启动 FastAPI 后端..."
cd "$PROJECT_ROOT"
"$PYTHON" main.py &
BACKEND_PID=$!

# 等待后端启动（最多10秒）
for i in $(seq 1 10); do
    sleep 1
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "✗ 后端启动失败，请检查错误信息"
        exit 1
    fi
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        break
    fi
done

echo "▶ 建立 SSH 反向隧道 (本地:8000 → 服务器:8000)"
echo "  按 Ctrl+C 停止"

cleanup() {
    echo ""
    echo "▶ 关闭中..."
    kill "$BACKEND_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM

PASS_FILE="$(dirname "$0")/.server-pass"
if [ -f "$PASS_FILE" ]; then
    sshpass -f "$PASS_FILE" ssh -N \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ExitOnForwardFailure=yes \
        -R 8000:localhost:8000 \
        "$SERVER"
else
    ssh -N \
        -o StrictHostKeyChecking=no \
        -o ServerAliveInterval=30 \
        -o ExitOnForwardFailure=yes \
        -R 8000:localhost:8000 \
        "$SERVER"
fi

cleanup
