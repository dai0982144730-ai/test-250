@echo off
chcp 65001 >nul
title Agent Base.vn - cong 3011
cd /d "%~dp0"

REM ⚠ BAT BUOC: may nay dat NODE_ENV=production o cap he thong.
REM   - Lam "npm install" bo mat TypeScript + Vitest
REM   - Lam "next dev" khong dich duoc Tailwind -> moi trang loi 500
REM Hai dong duoi ep ve development chi trong cua so nay.
set NODE_ENV=development

if not exist node_modules (
  echo  [1/2] Lan dau chay - dang cai thu vien...
  call npm install --include=dev
)

echo  [2/2] Dang bat Agent Base.vn tai http://localhost:3011 ...
start "" http://localhost:3011
call npx next dev -p 3011
pause
