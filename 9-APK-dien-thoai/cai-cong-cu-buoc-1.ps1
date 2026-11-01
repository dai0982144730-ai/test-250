# Bước 1: tải + giải nén công cụ build Android vào C:\dev (KHÔNG đổi biến môi trường hệ thống, không cần quyền quản trị).
# Bước chấp nhận điều khoản Android SDK + tải SDK là bước 2, chạy riêng sau khi anh đồng ý.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$goc = "C:\dev"
$tai = "$goc\_tai"
New-Item -ItemType Directory -Force $goc, $tai | Out-Null

function Tai($url, $tep) {
  if (-not (Test-Path $tep)) { Invoke-WebRequest -Uri $url -OutFile $tep -UseBasicParsing }
  "{0}: {1:N0} MB" -f (Split-Path $tep -Leaf), ((Get-Item $tep).Length / 1MB)
}
function GiaiNen($zip, $dich, $thuMucCon) {
  # giải vào thư mục tạm rồi đổi tên thư mục con duy nhất thành $dich (tránh lồng 2 lớp)
  if (Test-Path $dich) { "đã có: $dich"; return }
  $tam = "$goc\_tam"; if (Test-Path $tam) { Remove-Item $tam -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $tam -Force
  $con = if ($thuMucCon) { Join-Path $tam $thuMucCon } else { (Get-ChildItem $tam -Directory | Select-Object -First 1).FullName }
  Move-Item $con $dich
  Remove-Item $tam -Recurse -Force -ErrorAction SilentlyContinue
  "giải nén xong: $dich"
}

# 1) JDK 17 (Eclipse Temurin, Adoptium)
Tai "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse" "$tai\jdk17.zip"
GiaiNen "$tai\jdk17.zip" "$goc\jdk-17" $null

# 2) Công cụ dòng lệnh Android (Google) — cần nằm ở android-sdk\cmdline-tools\latest
Tai "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" "$tai\cmdline-tools.zip"
New-Item -ItemType Directory -Force "$goc\android-sdk\cmdline-tools" | Out-Null
if (-not (Test-Path "$goc\android-sdk\cmdline-tools\latest")) {
  $tam = "$goc\_tam2"; if (Test-Path $tam) { Remove-Item $tam -Recurse -Force }
  Expand-Archive -Path "$tai\cmdline-tools.zip" -DestinationPath $tam -Force
  Move-Item "$tam\cmdline-tools" "$goc\android-sdk\cmdline-tools\latest"
  Remove-Item $tam -Recurse -Force -ErrorAction SilentlyContinue
  "giải nén xong: cmdline-tools\latest"
}

# 3) Gradle 8.7 (gradle.org)
Tai "https://services.gradle.org/distributions/gradle-8.7-bin.zip" "$tai\gradle.zip"
GiaiNen "$tai\gradle.zip" "$goc\gradle-8.7" $null

"--- kiểm tra chạy được ---"
$env:JAVA_HOME = "$goc\jdk-17"
& "$goc\jdk-17\bin\java.exe" -version 2>&1 | Select-Object -First 2
& "$goc\gradle-8.7\bin\gradle.bat" --version 2>&1 | Select-String "Gradle |JVM:" | Select-Object -First 2
(& "$goc\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat" --version 2>&1 | Select-Object -First 1)
"--- dung lượng ---"
"{0:N2} GB đang dùng trong C:\dev" -f ((Get-ChildItem $goc -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1GB)
