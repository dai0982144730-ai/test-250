#!/usr/bin/env bash
# Tự cập nhật: kéo code mới từ GitHub, build, khởi động lại chỉ tiến trình scidocflow.
set -euo pipefail
cd "${APP_DIR:-/srv/scidocflow}"
git pull --ff-only
npm ci --no-audit --no-fund
npm run build
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 
cp -r db skills-he-thong mau-word .next/standalone/ 
ln -sfn "$(pwd)/data" .next/standalone/data
cp .env.local .next/standalone/.env.local
pm2 reload scidocflow || pm2 start deploy/ecosystem.config.cjs
pm2 save
