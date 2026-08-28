#!/usr/bin/env bash
# KOL Prediction — standalone static build (GitHub Pages).
# 0) 自动同步 daily_cache 的报告 JSON 到 ./kol/
# 1) Tailwind 从共享组件扫描并生成 prediction.css
# 2) esbuild 打包 React + prediction 组件到 dist/prediction.js
# 3) index.html + kol/*.json 数据目录拷入 dist/
# 数据更新流程：重跑 run_analysis.py（make research）后，在 standalone/ 下 make prediction 或 make build 即可。
set -euo pipefail
cd "$(dirname "$0")"

echo "[0/3] Syncing report data from daily_cache..."
mkdir -p kol
if ls ../../src/cloud-orchestrator/daily_cache/report_translated_*.json > /dev/null 2>&1; then
  cp ../../src/cloud-orchestrator/daily_cache/report_translated_*.json kol/
  echo "  Synced $(ls kol/report_translated_*.json | wc -l | tr -d ' ') report file(s) into kol/."
else
  echo "  ⚠️  No reports found in daily_cache — kol/ keeps its existing files."
fi

echo "[1/3] Preparing dist..."
mkdir -p dist

echo "[2/3] Building CSS with Tailwind..."
npx --yes tailwindcss@3.4.3 -c tailwind.config.js -i src/style.css -o dist/prediction.css --minify

echo "[3/3] Bundling with esbuild..."
NODE_PATH=../../src/client-edge/node_modules npx --yes esbuild src/main.tsx \
  --bundle \
  --format=iife \
  --platform=browser \
  --jsx=automatic \
  --loader:.css=css \
  --define:process.env.NODE_ENV='"production"' \
  --alias:next/link=./src/shims/next-link.tsx \
  --outfile=dist/prediction.js \
  --log-level=warning

echo "[4/4] Copying static assets..."
cp index.html dist/index.html
cp -R kol dist/kol

echo "Done. Deploy ./dist to GitHub Pages."