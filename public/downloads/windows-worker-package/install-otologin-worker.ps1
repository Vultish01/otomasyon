$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

Write-Host "OtoLogin Worker kurulumu basliyor..." -ForegroundColor Cyan

function Ensure-WingetPackage {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PackageId,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $wingetCommand = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $wingetCommand) {
        throw "Winget bulunamadi. $Label icin otomatik kurulum yapilamiyor."
    }

    Write-Host "$Label eksik. Winget ile kuruluyor..." -ForegroundColor Yellow
    winget install -e --id $PackageId --accept-package-agreements --accept-source-agreements
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) {
    Ensure-WingetPackage -PackageId "Python.Python.3.11" -Label "Python 3.11"
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        throw "Python kurulumu tamamlanmadi. Lutfen Python kurulumunu manuel kontrol edin."
    }
}

try {
    & python --version | Out-Null
}
catch {
    throw "Python komutu calismiyor. Lutfen PATH ayarini kontrol edin."
}

if (-not (Get-Command powershell -ErrorAction SilentlyContinue)) {
    throw "PowerShell bulunamadi. Bu kurulum PowerShell gerektirir."
}

if (-not (Test-Path ".venv")) {
    & python -m venv .venv
}

& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\.venv\Scripts\python.exe" -m pip install --upgrade setuptools wheel
& ".\.venv\Scripts\pip.exe" install -r ".\requirements-worker.txt"

if (-not (Test-Path ".\worker-config.json")) {
    Copy-Item ".\worker-config.template.json" ".\worker-config.json"
}

$startupBatPath = Join-Path $scriptRoot "start-otologin-worker.bat"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "OtoLogin Worker.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $startupBatPath
$shortcut.WorkingDirectory = $scriptRoot
$shortcut.Save()

Write-Host ""
Write-Host "Kurulum tamamlandi." -ForegroundColor Green
Write-Host "1) worker-config.json icindeki api_base_url, device_id ve exe_path alanlarini duzenleyin." -ForegroundColor White
Write-Host "2) Ardindan start-otologin-worker.bat dosyasini calistirin." -ForegroundColor White
Write-Host "3) Ayrica Windows acilisinda otomatik baslamasi icin Startup kisayolu da olusturuldu." -ForegroundColor White
