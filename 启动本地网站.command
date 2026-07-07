#!/bin/zsh
cd "$(dirname "$0")"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "没有找到 npm，请先安装 Node.js。"
  read "?按回车退出..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "首次运行，正在安装依赖..."
  npm install
fi

echo "正在启动 AI 一人公司生存地图..."
echo "浏览器地址：http://localhost:5173/"
echo "关闭这个窗口后，网站也会停止。"

npm run dev -- --host 0.0.0.0 &
SERVER_PID=$!

sleep 2
open "http://localhost:5173/"
wait $SERVER_PID
