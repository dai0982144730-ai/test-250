@echo off
rem SCI cong viec - bam dup de chay. Tu kiem tra Node.js, thu vien, build, tuong lua roi mo trinh duyet.
rem Chi tiet tung buoc: scripts\chay-ung-dung.ps1   (tham so: -Cong 3004  -KhongMoTrinhDuyet  -BuildLai)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\chay-ung-dung.ps1" %*
