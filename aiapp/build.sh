#!/usr/bin/env bash
# Content Interpreter — standalone static build (GitHub Pages).
# 1) esbuild 打包 React + interpreter + demo 到 aiapp/dist/aiapp.js
# 2) index.html 引用 aiapp.js，产物可直接推 GitHub Pages
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/2] Bundling with esbuild..."
npx --yes esbuild src/demo.tsx \
  --bundle \
  --format=iife \
  --platform=browser \
  --jsx=automatic \
  --loader:.css=css \
  --define:process.env.NODE_ENV='"production"' \
  --external:@mlc-ai/web-llm \
  --external:@huggingface/transformers \
  --outfile=dist/aiapp.js \
  --log-level=warning

echo "[2/2] Copying static assets..."
cp index.html dist/index.html

echo "Done. Deploy ./dist to GitHub Pages."
