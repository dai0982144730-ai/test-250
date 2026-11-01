<#
    dong-goi-portable.ps1
    ---------------------------------------------------------------
    Dong goi ban CHAY-LIEN (portable) cua QLDASCI: 1 lenh duy nhat.

    Vi du:
        powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\dong-goi-portable.ps1"
        powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\dong-goi-portable.ps1" -SkipBuild
        powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\dong-goi-portable.ps1" -Port 3200

    Ket qua: thu muc portable gom QLDASCI.exe + node.exe + app\ + HUONG-DAN.txt + PHIEN-BAN.txt
    Copy nguyen thu muc do sang may Windows 10/11 64-bit khac la chay duoc, khong can cai gi.
#>

[CmdletBinding()]
param(
    [string] $OutDir = "d:\CongviecHpt\QLDASCI\1. QLDA\QLDASCI-Portable",
    [switch] $SkipBuild,
    [int]    $Port = 3100
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# ================================================================
#  TIEN ICH IN TIEN TRINH
# ================================================================
$script:SoBuoc = 0

function Buoc {
    param([string] $NoiDung)
    $script:SoBuoc++
    Write-Host ""
    Write-Host ("[{0}] {1}" -f $script:SoBuoc, $NoiDung) -ForegroundColor Cyan
}

function Ok {
    param([string] $NoiDung)
    Write-Host ("    OK  - {0}" -f $NoiDung) -ForegroundColor Green
}

function Tin {
    param([string] $NoiDung)
    Write-Host ("        {0}" -f $NoiDung) -ForegroundColor DarkGray
}

function CanhBao {
    param([string] $NoiDung)
    Write-Host ("    !!! CANH BAO: {0}" -f $NoiDung) -ForegroundColor Yellow
}

function CanhBaoDo {
    param([string] $NoiDung)
    Write-Host ("    XXX THIEU: {0}" -f $NoiDung) -ForegroundColor Red -BackgroundColor Black
}

function DungLoi {
    param([string] $NoiDung)
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host (" LOI - DA DUNG DONG GOI: {0}" -f $NoiDung) -ForegroundColor Red
    Write-Host "===============================================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Copy nguyen thu muc bang robocopy (nhanh + chiu duoc duong dan sau).
# Robocopy tra ve 0..7 la thanh cong, >=8 la loi that.
function CopyThuMuc {
    param(
        [string] $Nguon,
        [string] $Dich,
        [string] $Nhan,
        [switch] $DeDdupe   # -DeDdupe: copy de ca file trung (dung cho buoc va loi)
    )

    if (-not (Test-Path -LiteralPath $Nguon)) {
        DungLoi ("Khong tim thay nguon de copy ({0}): {1}" -f $Nhan, $Nguon)
    }

    $doiSo = @($Nguon.TrimEnd('\'), $Dich.TrimEnd('\'), '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:2', '/W:1')
    if ($DeDdupe) { $doiSo += '/IS' }

    $null = & robocopy @doiSo
    $ma = $LASTEXITCODE
    if ($ma -ge 8) {
        DungLoi ("Copy that bai ({0}) - robocopy tra ve ma {1}. Nguon: {2}" -f $Nhan, $ma, $Nguon)
    }

    $soFile = @(Get-ChildItem -LiteralPath $Dich -Recurse -File -Force -ErrorAction SilentlyContinue).Count
    Ok ("{0}  ({1} file)" -f $Nhan, $soFile)
}

function DungLuongMB {
    param([string] $DuongDan)
    $tong = Get-ChildItem -LiteralPath $DuongDan -Recurse -File -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum
    if ($null -eq $tong.Sum) { return 0 }
    return [math]::Round($tong.Sum / 1MB, 1)
}

# ================================================================
#  MA NGUON C# CUA LAUNCHER (QLDASCI.exe)
#  __PORT__ se duoc thay bang tham so -Port truoc khi bien dich.
# ================================================================
$MaNguonLauncher = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;

static class QldasciLauncher
{
    const string PORT = "__PORT__";

    static void Loi(string thongBao)
    {
        try { Console.ForegroundColor = ConsoleColor.Red; } catch { }
        Console.WriteLine();
        Console.WriteLine("LOI: " + thongBao);
        try { Console.ResetColor(); } catch { }
        Console.WriteLine();
        Console.WriteLine("Nhan phim bat ky de dong cua so...");
        try { Console.ReadKey(true); } catch { }
    }

    static string LayIpLan()
    {
        try
        {
            foreach (IPAddress ip in Dns.GetHostAddresses(Dns.GetHostName()))
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                {
                    return ip.ToString();
                }
            }
        }
        catch { }
        return null;
    }

    static void InKhung(string ipLan)
    {
        try { Console.Title = "QLDASCI - He thong AI quan ly tien do du an"; } catch { }
        Console.WriteLine();
        Console.WriteLine("==============================================================");
        Console.WriteLine("     QLDASCI - HE THONG AI QUAN LY TIEN DO DU AN");
        Console.WriteLine("==============================================================");
        Console.WriteLine();
        Console.WriteLine("  Dang khoi dong may chu, lan dau co the mat 5-10 giay...");
        Console.WriteLine();
        Console.WriteLine("  Tren may nay        :  http://localhost:" + PORT);
        if (ipLan != null)
        {
            Console.WriteLine("  Tu may khac cung LAN:  http://" + ipLan + ":" + PORT);
        }
        else
        {
            Console.WriteLine("  Tu may khac cung LAN:  http://<IP-may-nay>:" + PORT);
        }
        Console.WriteLine();
        Console.WriteLine("  Trinh duyet se TU MO sau vai giay.");
        Console.WriteLine("  DE TAT UNG DUNG :  dong cua so den nay (hoac bam Ctrl + C).");
        Console.WriteLine("  LUU Y           :  KHONG dong cua so nay khi dang su dung.");
        Console.WriteLine("==============================================================");
        Console.WriteLine();
    }

    static int Main()
    {
        string thuMucGoc = AppDomain.CurrentDomain.BaseDirectory;
        string thuMucApp = Path.Combine(thuMucGoc, "app");
        string nodeExe   = Path.Combine(thuMucGoc, "node.exe");
        string serverJs  = Path.Combine(thuMucApp, "server.js");

        if (!File.Exists(nodeExe))
        {
            Loi("Khong tim thay node.exe ben canh QLDASCI.exe.\r\n" +
                "Hay copy NGUYEN thu muc portable, dung copy rieng file exe.");
            return 1;
        }
        if (!File.Exists(serverJs))
        {
            Loi("Khong tim thay app\\server.js.\r\n" +
                "Hay copy NGUYEN thu muc portable (phai co thu muc app ben canh).");
            return 1;
        }

        InKhung(LayIpLan());

        ProcessStartInfo psi = new ProcessStartInfo(nodeExe, "server.js");
        psi.WorkingDirectory = thuMucApp;
        psi.UseShellExecute  = false;
        psi.EnvironmentVariables["PORT"]     = PORT;
        psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
        psi.EnvironmentVariables["NODE_ENV"] = "production";

        Process tienTrinh;
        try
        {
            tienTrinh = Process.Start(psi);
        }
        catch (Exception ex)
        {
            Loi("Khong chay duoc node.exe: " + ex.Message);
            return 1;
        }

        Thread moTrinhDuyet = new Thread(delegate()
        {
            Thread.Sleep(3500);
            try
            {
                ProcessStartInfo mo = new ProcessStartInfo("http://localhost:" + PORT);
                mo.UseShellExecute = true;
                Process.Start(mo);
            }
            catch { }
        });
        moTrinhDuyet.IsBackground = true;
        moTrinhDuyet.Start();

        tienTrinh.WaitForExit();

        int ma = tienTrinh.ExitCode;
        if (ma != 0)
        {
            Loi("May chu da dung bat thuong (ma loi " + ma + ").\r\n" +
                "Nguyen nhan hay gap: cong " + PORT + " dang bi ung dung khac chiem.");
        }
        return ma;
    }
}
'@

# ================================================================
#  BAT DAU
# ================================================================
$ThuMucScript = Split-Path -Parent $MyInvocation.MyCommand.Path
$ThuMucDuAn   = Split-Path -Parent $ThuMucScript

Write-Host ""
Write-Host "===============================================================" -ForegroundColor White
Write-Host "  DONG GOI BAN CHAY-LIEN (PORTABLE) - QLDASCI" -ForegroundColor White
Write-Host "===============================================================" -ForegroundColor White
Tin ("Thu muc du an : {0}" -f $ThuMucDuAn)
Tin ("Thu muc dich  : {0}" -f $OutDir)
Tin ("Cong (port)   : {0}" -f $Port)
if ($SkipBuild) { Tin "Che do        : -SkipBuild (bo qua npm run build)" }

# ---------------------------------------------------------------
Buoc "Kiem tra moi truong va cau hinh next.config.mjs"

if (-not (Test-Path -LiteralPath (Join-Path $ThuMucDuAn 'package.json'))) {
    DungLoi ("Khong thay package.json trong {0} - script phai nam trong CodeQLDA\scripts\." -f $ThuMucDuAn)
}

$FileConfig = Join-Path $ThuMucDuAn 'next.config.mjs'
if (-not (Test-Path -LiteralPath $FileConfig)) {
    DungLoi ("Khong tim thay {0}" -f $FileConfig)
}

$NoiDungConfig = Get-Content -LiteralPath $FileConfig -Raw
if ($NoiDungConfig -notmatch 'output\s*:\s*["'']standalone["'']') {
    DungLoi @"
next.config.mjs CHUA bat che do standalone.
  Hay them dong sau vao trong nextConfig roi chay lai:

      output: "standalone",

  File can sua: $FileConfig
"@
}
Ok "next.config.mjs co output: standalone"

$LenhNode = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $LenhNode) {
    DungLoi "Khong tim thay node trong PATH. Hay cai Node.js 18+ roi chay lai."
}
$NodeExeNguon = $LenhNode.Source
Ok ("node.exe : {0}  (phien ban {1})" -f $NodeExeNguon, (& node -v))

# ---------------------------------------------------------------
Buoc "Build ung dung (npm run build)"

if ($SkipBuild) {
    CanhBao "Bo qua build theo tham so -SkipBuild. Hay chac chan .next\ la ban MOI NHAT."
} else {
    $Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $Npm) { $Npm = Get-Command npm -ErrorAction SilentlyContinue }
    if ($null -eq $Npm) { DungLoi "Khong tim thay npm trong PATH." }

    Tin "Dang build... (co the mat 1-3 phut, xin cho)"
    Push-Location -LiteralPath $ThuMucDuAn
    try {
        & $Npm.Source run build
        $MaBuild = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($MaBuild -ne 0) {
        DungLoi ("npm run build that bai (ma loi {0}). Sua loi build roi chay lai." -f $MaBuild)
    }
    Ok "Build thanh cong"
}

$ThuMucStandalone = Join-Path $ThuMucDuAn '.next\standalone'
$ThuMucStatic     = Join-Path $ThuMucDuAn '.next\static'
if (-not (Test-Path -LiteralPath $ThuMucStandalone)) {
    DungLoi ("Khong tim thay {0}. Hay chay lai KHONG kem -SkipBuild." -f $ThuMucStandalone)
}
if (-not (Test-Path -LiteralPath $ThuMucStatic)) {
    DungLoi ("Khong tim thay {0}. Hay chay lai KHONG kem -SkipBuild." -f $ThuMucStatic)
}

# ---------------------------------------------------------------
Buoc "Don thu muc dich cu va tao lai"

if (Test-Path -LiteralPath $OutDir) {
    Tin ("Dang xoa ban cu: {0}" -f $OutDir)
    try {
        Remove-Item -LiteralPath $OutDir -Recurse -Force -Confirm:$false
    } catch {
        DungLoi @"
Khong xoa duoc thu muc cu: $OutDir
  Nguyen nhan hay gap: ban portable dang CHAY (QLDASCI.exe / node.exe chua tat),
  hoac dang mo File Explorer trong thu muc do.
  Hay tat het roi chay lai. Chi tiet: $($_.Exception.Message)
"@
    }
}
$null = New-Item -ItemType Directory -Path $OutDir -Force
$ThuMucAppDich = Join-Path $OutDir 'app'
$null = New-Item -ItemType Directory -Path $ThuMucAppDich -Force
Ok ("Da tao thu muc dich sach: {0}" -f $OutDir)

# ---------------------------------------------------------------
Buoc "Copy ung dung (standalone + static + public + data)"

CopyThuMuc -Nguon $ThuMucStandalone -Dich $ThuMucAppDich -Nhan '.next\standalone -> app'
CopyThuMuc -Nguon $ThuMucStatic -Dich (Join-Path $ThuMucAppDich '.next\static') -Nhan '.next\static -> app\.next\static'

$ThuMucPublic = Join-Path $ThuMucDuAn 'public'
if (Test-Path -LiteralPath $ThuMucPublic) {
    CopyThuMuc -Nguon $ThuMucPublic -Dich (Join-Path $ThuMucAppDich 'public') -Nhan 'public -> app\public'
} else {
    Tin "Du an khong co thu muc public - bo qua (binh thuong)."
}

$ThuMucData = Join-Path $ThuMucDuAn 'data'
if (-not (Test-Path -LiteralPath $ThuMucData)) {
    DungLoi ("Khong tim thay thu muc du lieu: {0}" -f $ThuMucData)
}
CopyThuMuc -Nguon $ThuMucData -Dich (Join-Path $ThuMucAppDich 'data') -Nhan 'data -> app\data'

if (-not (Test-Path -LiteralPath (Join-Path $ThuMucAppDich 'server.js'))) {
    DungLoi "Sau khi copy van khong thay app\server.js - ban build standalone bi hong."
}

# ---------------------------------------------------------------
Buoc "VA 2 THIEU SOT DA BIET cua Next standalone (@napi-rs + pdf-parse)"

$NodeModulesNguon = Join-Path $ThuMucDuAn 'node_modules'
$NodeModulesDich  = Join-Path $ThuMucAppDich 'node_modules'

# (a) @napi-rs - pdfjs can DOMMatrix, Next khong copy sang standalone
$NapiNguon = Join-Path $NodeModulesNguon '@napi-rs'
$NapiDich  = Join-Path $NodeModulesDich  '@napi-rs'
if (Test-Path -LiteralPath $NapiNguon) {
    CopyThuMuc -Nguon $NapiNguon -Dich $NapiDich -Nhan 'node_modules\@napi-rs (DOMMatrix cho pdfjs)'
} else {
    CanhBaoDo "Khong tim thay node_modules\@napi-rs trong du an. Tinh nang doc PDF co the loi DOMMatrix. Hay chay: npm install"
}

# (b) pdf-parse - Next bo sot pdf.worker.mjs -> doc PDF loi
$PdfNguon = Join-Path $NodeModulesNguon 'pdf-parse'
$PdfDich  = Join-Path $NodeModulesDich  'pdf-parse'
if (Test-Path -LiteralPath $PdfNguon) {
    CopyThuMuc -Nguon $PdfNguon -Dich $PdfDich -Nhan 'node_modules\pdf-parse (copy DE, kem pdf.worker.mjs)' -DeDdupe
} else {
    CanhBaoDo "Khong tim thay node_modules\pdf-parse trong du an. Tinh nang doc BC Ngay PDF se KHONG chay. Hay chay: npm install"
}

# (c) Kiem tra lai sau khi va
$CoLoiVa = $false

if (Test-Path -LiteralPath $NapiDich) {
    Ok "Kiem tra: app\node_modules\@napi-rs ton tai"
} else {
    CanhBaoDo "THIEU app\node_modules\@napi-rs -> doc PDF se bao loi 'DOMMatrix is not defined'."
    $CoLoiVa = $true
}

$WorkerChuan = Join-Path $PdfDich 'dist\pdf-parse\cjs\pdf.worker.mjs'
if (Test-Path -LiteralPath $WorkerChuan) {
    Ok "Kiem tra: pdf-parse\dist\pdf-parse\cjs\pdf.worker.mjs ton tai"
} else {
    $WorkerKhac = @()
    if (Test-Path -LiteralPath $PdfDich) {
        $WorkerKhac = @(Get-ChildItem -LiteralPath $PdfDich -Recurse -File -Filter '*worker*.mjs' -ErrorAction SilentlyContinue)
    }
    if ($WorkerKhac.Count -gt 0) {
        Ok ("Kiem tra: tim thay {0} file worker khac trong pdf-parse (vd: {1})" -f $WorkerKhac.Count, $WorkerKhac[0].Name)
    } else {
        CanhBaoDo "THIEU pdf.worker.mjs trong app\node_modules\pdf-parse -> doc BC Ngay PDF se LOI."
        $CoLoiVa = $true
    }
}

if ($CoLoiVa) {
    CanhBao "Ban portable van tao xong nhung TINH NANG DOC PDF CO THE HONG. Hay chay 'npm install' trong CodeQLDA roi dong goi lai."
}

# ---------------------------------------------------------------
Buoc "Copy node.exe"

Copy-Item -LiteralPath $NodeExeNguon -Destination (Join-Path $OutDir 'node.exe') -Force
$KichThuocNode = [math]::Round((Get-Item -LiteralPath (Join-Path $OutDir 'node.exe')).Length / 1MB, 1)
Ok ("node.exe -> {0}\node.exe  ({1} MB)" -f $OutDir, $KichThuocNode)

# ---------------------------------------------------------------
Buoc "Bien dich launcher QLDASCI.exe"

$CscExe    = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$FileExe   = Join-Path $OutDir 'QLDASCI.exe'
$DaCoExe   = $false

if (Test-Path -LiteralPath $CscExe) {
    $FileCs = Join-Path $env:TEMP ("QldasciLauncher_{0}.cs" -f ([guid]::NewGuid().ToString('N')))
    try {
        $MaNguonLauncher.Replace('__PORT__', [string]$Port) |
            Set-Content -LiteralPath $FileCs -Encoding ASCII

        $KetQuaCsc = & $CscExe /nologo /target:exe /out:"$FileExe" "$FileCs" 2>&1
        $MaCsc = $LASTEXITCODE

        if ($MaCsc -ne 0 -or -not (Test-Path -LiteralPath $FileExe)) {
            CanhBao ("csc.exe bien dich that bai (ma {0}). Se dung file .bat du phong." -f $MaCsc)
            $KetQuaCsc | ForEach-Object { Tin $_ }
        } else {
            $DaCoExe = $true
            Ok ("Da bien dich QLDASCI.exe (cong {0}, tu mo trinh duyet sau 3.5 giay)" -f $Port)
        }
    } finally {
        if (Test-Path -LiteralPath $FileCs) {
            Remove-Item -LiteralPath $FileCs -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    CanhBao ("Khong tim thay csc.exe tai {0} - bo qua buoc tao .exe, chi dung file .bat du phong." -f $CscExe)
}

# File .bat du phong: luon tao (chay duoc ke ca khi khong co .exe)
$NoiDungBat = @"
@echo off
title QLDASCI - He thong AI quan ly tien do du an
cd /d "%~dp0app"
set PORT=$Port
set HOSTNAME=0.0.0.0
set NODE_ENV=production
echo.
echo ==============================================================
echo      QLDASCI - HE THONG AI QUAN LY TIEN DO DU AN
echo ==============================================================
echo.
echo   Dang khoi dong... Mo trinh duyet:  http://localhost:$Port
echo   DE TAT: dong cua so nay hoac bam Ctrl + C.
echo.
start "" "http://localhost:$Port"
"%~dp0node.exe" server.js
echo.
echo May chu da dung. Nhan phim bat ky de dong...
pause >nul
"@
Set-Content -LiteralPath (Join-Path $OutDir 'CHAY-UNG-DUNG.bat') -Value $NoiDungBat -Encoding ASCII
Ok "Da tao CHAY-UNG-DUNG.bat (du phong)"

# ---------------------------------------------------------------
Buoc "Ghi HUONG-DAN.txt"

$NgayDongGoi = Get-Date -Format 'dd/MM/yyyy HH:mm'

$HuongDan = @"
==============================================================
 QLDASCI PORTABLE - HE THONG AI QUAN LY TIEN DO DU AN
 Ban dong goi ngay: $NgayDongGoi
==============================================================

CACH DUNG (may Windows 10/11 64-bit, KHONG CAN CAI GI):

  1. Copy NGUYEN thu muc "QLDASCI-Portable" sang may moi
     (USB / o cung / o mang deu duoc). Dung copy rieng tung file.
  2. Bam dup vao  QLDASCI.exe
     (neu may chan file .exe thi bam dup  CHAY-UNG-DUNG.bat  thay the).
  3. Cho 5-10 giay, trinh duyet se TU MO trang http://localhost:$Port
  4. Dang nhap bang tai khoan demo ben duoi.
  5. TAT UNG DUNG: dong cua so den (cua so mau den) cua QLDASCI.exe.
     KHONG dong cua so do khi dang su dung ung dung.

TAI KHOAN DEMO (mat khau giong nhau: Sci@2026)

  dai@sci.vn          / Sci@2026    - Quan ly du an (PM)
  duong@sci.vn        / Sci@2026    - Ky su
  hientruong@sci.vn   / Sci@2026    - Hien truong

DU LIEU CUA BAN NAM O DAU

  - Toan bo du lieu nam trong thu muc:   app\data
    (du an, tien do, bao cao ngay, nguoi dung, cai dat, lich su chat AI...)
  - SAO LUU  = copy thu muc  app\data  ra cho khac.
  - CHUYEN MAY = copy ca thu muc portable, hoac chi thay the  app\data.
  - Ban portable va ban cai dat goc co du lieu RIENG, khong dung chung.

XEM TU MAY KHAC TRONG CUNG MANG LAN

  - Chi can 1 may chay QLDASCI.exe (goi la may chu).
  - Tren may chu, mo Command Prompt go:  ipconfig
    xem dong "IPv4 Address", vi du 192.168.1.25
  - Cac may khac mo trinh duyet va go:   http://192.168.1.25:$Port
  - Neu khong vao duoc: tren may chu, cho phep node.exe di qua
    Windows Defender Firewall (chon mang Private), hoac tam tat firewall.

LUU Y MOI - TINH NANG KET NOI AI

  - Muc  Cai dat -> Ket noi AI  co 2 cach dung:
      (1) Claude CLI: may do phai cai Claude CLI truoc. Vao
          Cai dat -> Ket noi AI -> bam nut "Cai dat tu dong",
          cho cai xong roi dang nhap tai khoan Claude.
      (2) API key: dan API key vao o tuong ung roi bam Luu / Kiem tra.
  - Neu chua lam buoc nay thi Tro ly AI va cac tinh nang AI se bao
    "chua ket noi" - cac chuc nang con lai (tien do, Gantt, bao cao,
    nhap Excel, doc PDF) van chay binh thuong.
  - May chay AI can co Internet. Cac tinh nang khac chay offline duoc.

LUU Y KHAC

  - Cong mac dinh la $Port. Neu bao loi "cong dang bi chiem", hay tat
    ung dung dang chiem cong do, hoac dong goi lai voi cong khac.
  - Khong chay dong thoi 2 ban (portable + ban cai dat) tren cung 1 may
    vi se tranh nhau cong $Port.
  - Lan chay dau tien Windows co the hoi "Windows protected your PC":
    bam "More info" -> "Run anyway" (file do minh tu tao nen chua ky so).

==============================================================
"@

Set-Content -LiteralPath (Join-Path $OutDir 'HUONG-DAN.txt') -Value $HuongDan -Encoding ASCII
Ok "Da ghi HUONG-DAN.txt"

# ---------------------------------------------------------------
Buoc "Ghi PHIEN-BAN.txt"

$TongMB   = DungLuongMB -DuongDan $OutDir
$TongFile = @(Get-ChildItem -LiteralPath $OutDir -Recurse -File -Force -ErrorAction SilentlyContinue).Count
$PhienBanNode = (& node -v)

$PhienBan = @"
==============================================================
 QLDASCI PORTABLE - THONG TIN PHIEN BAN
==============================================================

 Ngay dong goi   : $NgayDongGoi
 Tong dung luong : $TongMB MB
 Tong so file    : $TongFile file
 Cong mac dinh   : $Port
 Node.js kem theo: $PhienBanNode
 Nguon dong goi  : $ThuMucDuAn

--------------------------------------------------------------
 CAC TINH NANG CHINH TRONG BAN NAY
--------------------------------------------------------------

  1.  Da du an - quan ly nhieu du an song song, chuyen doi nhanh
      giua cac du an (dien gio, thuy dien...).
  2.  Lap tien do CPM - tinh duong gang, som/muon, du tru thoi gian
      tu quan he truoc-sau giua cac cong viec.
  3.  Bieu do Gantt truc quan - xem theo ngay/tuan/thang, hien duong
      gang va % hoan thanh tung cong viec.
  4.  Nhap tien do tu Excel / MS Project - doc file ke hoach co san,
      tu do khong phai go tay lai toan bo cong viec.
  5.  Doc Bao Cao Ngay dang PDF - tu boc tach so lieu hien truong
      trong file PDF va cap nhat vao he thong.
  6.  Ket noi AI 2 kieu - qua Claude CLI (co nut cai dat tu dong)
      hoac qua API key; kiem tra trang thai ket noi ngay trong Cai dat.
  7.  Tro ly AI dang chat - hoi dap ve tien do, rui ro cham tien do,
      goi y dieu chinh ke hoach; luu lai lich su tung phien chat.
  8.  Sinh bao cao tu dong - bao cao ngay/tuan, xuat file Word (docx)
      va Excel de gui cap tren.
  9.  Phan quyen 3 vai tro - Quan ly du an (PM), Ky su, Hien truong;
      moi vai tro thay va sua duoc dung phan viec cua minh.
  10. Doi chieu cheo (crosscheck) so lieu, canh bao cham tien do,
      theo doi nang suat, nha thau, thoi tiet va anh hien truong.
  11. Da kiem thu E2E tu dong truoc khi dong goi; du lieu luu file
      cuc bo trong app\data nen chay duoc hoan toan offline
      (tru cac tinh nang AI can Internet).

==============================================================
"@

Set-Content -LiteralPath (Join-Path $OutDir 'PHIEN-BAN.txt') -Value $PhienBan -Encoding ASCII
Ok "Da ghi PHIEN-BAN.txt"

# ---------------------------------------------------------------
#  TONG KET
# ---------------------------------------------------------------
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  DONG GOI XONG!" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ("  Thu muc     : {0}" -f $OutDir) -ForegroundColor White
Write-Host ("  Dung luong  : {0} MB  ({1} file)" -f $TongMB, $TongFile) -ForegroundColor White
Write-Host ("  Cong        : {0}  ->  http://localhost:{0}" -f $Port) -ForegroundColor White
if ($DaCoExe) {
    Write-Host  "  Launcher    : QLDASCI.exe (+ CHAY-UNG-DUNG.bat du phong)" -ForegroundColor White
} else {
    Write-Host  "  Launcher    : CHAY-UNG-DUNG.bat (KHONG tao duoc .exe)" -ForegroundColor Yellow
}
if ($CoLoiVa) {
    Write-Host  "  CANH BAO    : thieu file cho tinh nang doc PDF - xem canh bao do o tren!" -ForegroundColor Red
}
Write-Host ""
Write-Host "  BUOC TIEP THEO:" -ForegroundColor Cyan
Write-Host "    Copy NGUYEN thu muc tren sang may khac, roi bam dup QLDASCI.exe." -ForegroundColor Cyan
Write-Host "    Doc them HUONG-DAN.txt va PHIEN-BAN.txt trong thu muc do." -ForegroundColor Cyan
Write-Host ""

exit 0
