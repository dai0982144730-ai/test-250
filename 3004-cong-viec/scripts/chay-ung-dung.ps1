# ============================================================
# scripts/chay-ung-dung.ps1 — CHẠY SCI DOCFLOW (gọi từ CHAY-UNG-DUNG.bat, bấm đúp là chạy).
# Chép cả thư mục CodeSCICongViec sang máy khác vẫn chạy: script tự lo từng bước —
#   1. Node.js: chưa có thì cài bằng winget (cần Internet), không được thì mở trang tải Node.js.
#   2. Thư viện (node_modules): chưa có thì npm install (cần Internet, chỉ lần đầu).
#   3. Khóa phiên đăng nhập (.env.local): chưa có thì tự tạo.
#   4. Bản chạy (.next): chưa có, hoặc mã nguồn mới hơn bản đã build → build lại (vài phút, chỉ khi cần).
#   5. Mở cổng tường lửa cho máy khác trong mạng LAN (hỏi quyền quản trị một lần).
#   6. Chạy máy chủ, in địa chỉ LAN, tự mở trình duyệt. Đóng cửa sổ này = tắt ứng dụng.
# Dữ liệu (cơ sở dữ liệu + file) nằm trong data/ — chép kèm thư mục là mang theo dữ liệu.
# Tham số: -Cong 3004  -KhongMoTrinhDuyet  -BuildLai  -KhongMoTuongLua
# ============================================================
param([int]$Cong = 3004, [switch]$KhongMoTrinhDuyet, [switch]$BuildLai, [switch]$KhongMoTuongLua)

$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$Host.UI.RawUI.WindowTitle = "SCI công việc — cổng $Cong"
$goc = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $goc

function Bao([string]$m, [string]$mau = "Gray") { Write-Host $m -ForegroundColor $mau }
function Loi([string]$m) {
  Bao ""
  Bao "  ✖ $m" Red
  Bao ""
  Read-Host "Bấm Enter để đóng"
  exit 1
}
function NapPath { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }

Bao ""
Bao "  ███ SCI công việc — Giao việc bằng tài liệu ███" DarkYellow
Bao "  Thư mục: $goc" DarkGray
Bao ""

# ---------- 1. Node.js ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Bao "[1/6] Máy chưa có Node.js — đang cài bản LTS (cần Internet)…" Yellow
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    NapPath
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Start-Process "https://nodejs.org/vi/download"
    Loi "Chưa cài được Node.js tự động. Trang tải Node.js đã mở: cài bản LTS (Windows Installer) rồi bấm lại CHAY-UNG-DUNG.bat."
  }
}
$phienBanNode = (& node -v).Trim().TrimStart("v")
if ([version]$phienBanNode -lt [version]"18.17.0") { Loi "Node.js $phienBanNode quá cũ (cần 18.17 trở lên, khuyên dùng bản LTS mới). Cài bản mới từ https://nodejs.org rồi chạy lại." }
Bao "[1/6] Node.js $phienBanNode ✓" Green

# ---------- 2. Thư viện ----------
if (-not (Test-Path "node_modules\next\package.json")) {
  Bao "[2/6] Chưa có thư viện — đang cài (lần đầu, cần Internet, vài phút)…" Yellow
  $env:NODE_ENV = "development"   # máy có thể đặt NODE_ENV=production toàn cục → npm bỏ qua thư viện cần để build
  & npm install --include=dev --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Loi "Cài thư viện lỗi (xem dòng đỏ ở trên). Kiểm tra Internet rồi chạy lại." }
}
Bao "[2/6] Thư viện ✓" Green

# ---------- 3. Khóa phiên đăng nhập ----------
if (-not (Test-Path ".env.local")) {
  $b = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  $khoa = [Convert]::ToBase64String($b)
  [IO.File]::WriteAllText((Join-Path $goc ".env.local"), "AUTH_SECRET=$khoa`r`n# Để trống = PGlite trong data/pgdata`r`n# DATABASE_URL=`r`n")
  Bao "[3/6] Đã tạo khóa phiên đăng nhập (.env.local) ✓" Green
} else { Bao "[3/6] Khóa phiên đăng nhập ✓" Green }

# ---------- 4. Bản chạy ----------
$buildId = ".next\BUILD_ID"
$canBuild = [bool]$BuildLai -or -not (Test-Path $buildId)
if (-not $canBuild) {
  $mocBuild = (Get-Item $buildId).LastWriteTime
  $nguon = @("src", "public", "db", "scripts", "packages", "skills-he-thong") | Where-Object { Test-Path $_ } | ForEach-Object { Get-ChildItem $_ -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "chay-ung-dung.ps1" } }
  $nguon += @("package.json", "next.config.mjs", "tailwind.config.ts", "mau-word\dinh-nghia.json") | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }
  $moiNhat = $nguon | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($moiNhat -and $moiNhat.LastWriteTime -gt $mocBuild) { $canBuild = $true; Bao "[4/6] Mã nguồn đã đổi ($($moiNhat.Name)) — build lại." Yellow }
}
if ($canBuild) {
  Bao "[4/6] Đang build bản chạy (vài phút, chỉ khi cần)…" Yellow
  $env:NODE_ENV = "production"
  $env:NEXT_OUTPUT_STANDALONE = "0"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  Remove-Item Env:DIST_DIR -ErrorAction SilentlyContinue
  # 26/10/2026: build vượt trần 4 GB mặc định của Node ở tiến trình con (hết bộ nhớ, bản chạy cũ đã bị xoá) → nới 8 GB
  # bằng biến môi trường để cả tiến trình con của next build cũng nhận
  $env:NODE_OPTIONS = "--max-old-space-size=8192"
  & node "node_modules\next\dist\bin\next" build
  Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
  if ($LASTEXITCODE -ne 0) { Loi "Build lỗi (xem ở trên). Chụp màn hình gửi bộ phận kỹ thuật." }
}
Bao "[4/6] Bản chạy ✓" Green

# ---------- 5. Cổng & tường lửa ----------
$dangNghe = Get-NetTCPConnection -LocalPort $Cong -State Listen -ErrorAction SilentlyContinue
if ($dangNghe) {
  $pid0 = ($dangNghe | Select-Object -First 1).OwningProcess
  $ten = (Get-Process -Id $pid0 -ErrorAction SilentlyContinue).ProcessName
  Bao "[5/6] Cổng $Cong đang có chương trình chạy ($ten, PID $pid0) — có thể SCI công việc đã mở sẵn." Yellow
  if (-not $KhongMoTrinhDuyet) { Start-Process "http://localhost:$Cong" }
  Loi "Không chạy thêm bản thứ hai. Muốn chạy lại: đóng cửa sổ SCI công việc đang chạy (hoặc tắt PID $pid0) rồi bấm lại."
}
$tenLuat = "SCI DocFlow $Cong"
$coLuat = $false
try { $coLuat = [bool](Get-NetFirewallRule -DisplayName $tenLuat -ErrorAction SilentlyContinue) } catch {}
if (-not $coLuat -and -not $KhongMoTuongLua) {
  Bao "[5/6] Mở cổng $Cong trên tường lửa cho máy khác trong mạng LAN (Windows hỏi quyền quản trị — bấm Yes)…" Yellow
  try {
    $lenh = "New-NetFirewallRule -DisplayName '$tenLuat' -Direction Inbound -Protocol TCP -LocalPort $Cong -Action Allow -Profile Domain,Private | Out-Null"
    Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", $lenh
  } catch { Bao "      Chưa mở được cổng (không có quyền quản trị): máy này vẫn dùng được, máy khác chưa vào được." DarkYellow }
}
Bao "[5/6] Cổng $Cong ✓" Green

# ---------- 6. Chạy ----------
$ip = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "vEthernet|VirtualBox|VMware|Loopback" } |
  Select-Object -ExpandProperty IPAddress)
Bao ""
Bao "  ┌─────────────────────────────────────────────────────────────" DarkYellow
Bao "  │ SCI công việc đang chạy — ĐỪNG ĐÓNG cửa sổ này (đóng = tắt ứng dụng)" White
Bao "  │ Trên máy này:        http://localhost:$Cong" Cyan
foreach ($x in $ip) { Bao "  │ Máy khác trong LAN:  http://${x}:$Cong" Cyan }
Bao "  └─────────────────────────────────────────────────────────────" DarkYellow
Bao ""

$env:NODE_ENV = "production"
$env:PORT = "$Cong"
$env:NEXT_OUTPUT_STANDALONE = "0"   # chạy bằng next start (không dùng bản standalone của máy chủ)
$env:NEXT_TELEMETRY_DISABLED = "1"
Remove-Item Env:DIST_DIR -ErrorAction SilentlyContinue
if (-not $KhongMoTrinhDuyet) {
  # Mở trình duyệt khi máy chủ đã sẵn sàng
  Start-Job -ScriptBlock {
    param($c)
    for ($i = 0; $i -lt 90; $i++) {
      try { Invoke-WebRequest "http://localhost:$c/login" -UseBasicParsing -TimeoutSec 5 | Out-Null; Start-Process "http://localhost:$c"; return } catch { Start-Sleep 2 }
    }
  } -ArgumentList $Cong | Out-Null
}
& node "node_modules\next\dist\bin\next" start -p $Cong -H 0.0.0.0
Bao "Máy chủ đã dừng." Yellow
Read-Host "Bấm Enter để đóng"
