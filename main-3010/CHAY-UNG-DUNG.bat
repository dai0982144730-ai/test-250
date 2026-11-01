@echo off
chcp 65001 >nul
title QLDASCI - He thong AI quan ly tien do
cd /d "%~dp0"

REM ===== 1. Kiem tra Node.js =====
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [X] May nay CHUA cai Node.js.
  echo      Tai ban LTS tai: https://nodejs.org  ^(cai xong chay lai file nay^)
  echo.
  pause
  exit /b 1
)

REM ===== 2. Cai thu vien neu chua co =====
if not exist node_modules (
  echo  [1/3] Lan dau chay tren may nay - dang cai thu vien ^(vai phut^)...
  call npm install --include=dev
  if errorlevel 1 ( echo  [X] Cai thu vien loi. & pause & exit /b 1 )
)

REM ===== 3. Build neu chua co =====
if not exist .next\BUILD_ID (
  echo  [2/3] Dang build ung dung ^(1-2 phut^)...
  call npm run build
  if errorlevel 1 ( echo  [X] Build loi. & pause & exit /b 1 )
)

REM ===== 4. Chay server + mo trinh duyet =====
echo  [3/3] Dang khoi dong server tai http://localhost:3100 ...
start "" http://localhost:3100
echo.
echo  ============================================================
echo   DANG CHAY. Muon TAT ung dung: dong cua so den nay ^(Ctrl+C^)
echo   May khac trong cung mang LAN mo bang: http://^<IP-may-nay^>:3100
echo  ============================================================
echo.
call npx next start -p 3100
pause
