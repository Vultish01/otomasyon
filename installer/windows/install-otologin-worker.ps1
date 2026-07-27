$ErrorActionPreference = "Stop"
$installerVersion = "2026.07.27.2"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot

Write-Host "OtoLogin Worker kurulumu basliyor..." -ForegroundColor Cyan
Write-Host "Kurulum surumu: $installerVersion" -ForegroundColor DarkGray

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

function Read-ValueOrDefault {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [string]$DefaultValue = ""
    )

    if ([string]::IsNullOrWhiteSpace($DefaultValue)) {
        $value = Read-Host $Prompt
    }
    else {
        $value = Read-Host "$Prompt [$DefaultValue]"
    }

    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }

    return $value.Trim()
}

function ConvertTo-StringArray {
    param([object]$Value)

    if ($null -eq $Value) {
        return @()
    }

    if ($Value -is [System.Array]) {
        return @($Value | ForEach-Object { "$_" })
    }

    if ([string]::IsNullOrWhiteSpace("$Value")) {
        return @()
    }

    return @("$Value")
}

function Get-OrCreateMachineKey {
    param([string]$IdentityPath)

    if (Test-Path $IdentityPath) {
        $identity = Get-Content $IdentityPath -Raw | ConvertFrom-Json
        if (-not [string]::IsNullOrWhiteSpace($identity.machine_key)) {
            return $identity.machine_key
        }
    }

    $machineKey = [guid]::NewGuid().ToString()
    @{
        machine_key = $machineKey
    } | ConvertTo-Json | Set-Content -Path $IdentityPath -Encoding UTF8
    return $machineKey
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

$configPath = Join-Path $scriptRoot "worker-config.json"
$templatePath = Join-Path $scriptRoot "worker-config.template.json"
$identityPath = Join-Path $scriptRoot "machine-identity.json"

if (-not (Test-Path $configPath)) {
    Copy-Item $templatePath $configPath
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$machineKey = Get-OrCreateMachineKey -IdentityPath $identityPath
$computerName = $env:COMPUTERNAME
$osCaption = (Get-CimInstance Win32_OperatingSystem).Caption

$apiBaseUrl = "$($config.api_base_url)".TrimEnd("/")
if ([string]::IsNullOrWhiteSpace($apiBaseUrl)) {
    throw "Kurulum paketinde API adresi yok. Lutfen guncel worker paketini tekrar indirin."
}
$exePath = Read-ValueOrDefault -Prompt "Bu bilgisayardaki EXE yolu" -DefaultValue $config.exe_path
$windowCount = [int](Read-ValueOrDefault -Prompt "Baslangic pencere sayisi" -DefaultValue "$($config.window_count)")
$healthCheck = [int](Read-ValueOrDefault -Prompt "Kontrol araligi (sn)" -DefaultValue "$($config.health_check_interval_sec)")
$cooldown = [int](Read-ValueOrDefault -Prompt "Reconnect cooldown (sn)" -DefaultValue "$($config.reconnect_cooldown_sec)")
$launchArgsInput = Read-ValueOrDefault -Prompt "Launch argumanlari (bos birakilabilir)" -DefaultValue ((ConvertTo-StringArray $config.launch_args) -join " ")
$launchArgs = if ([string]::IsNullOrWhiteSpace($launchArgsInput)) { @() } else { @($launchArgsInput -split "\s+") }

Write-Host ""
Write-Host "Cihaz web paneline kaydediliyor..." -ForegroundColor Cyan

$registrationPayload = [ordered]@{
    machine_key = $machineKey
    name = $computerName
    os_version = $osCaption
    exe_path = $exePath
    window_count = $windowCount
    health_check_interval_sec = $healthCheck
    reconnect_cooldown_sec = $cooldown
    launch_args = @(ConvertTo-StringArray $launchArgs)
}

$registrationBody = $registrationPayload | ConvertTo-Json -Depth 8 -Compress

try {
    $env:OTOLOGIN_REGISTRATION_API = "$apiBaseUrl/api/devices/register"
    $env:OTOLOGIN_REGISTRATION_BODY = $registrationBody

    $registrationResponseJson = & ".\.venv\Scripts\python.exe" -c @"
import json
import os
import sys

import httpx

url = os.environ["OTOLOGIN_REGISTRATION_API"]
payload = json.loads(os.environ["OTOLOGIN_REGISTRATION_BODY"])

try:
    response = httpx.post(url, json=payload, timeout=60.0)
except Exception as exc:
    print(f"Baglanti hatasi: {exc}", file=sys.stderr)
    sys.exit(1)

if response.is_error:
    print(f"HTTP {response.status_code}: {response.text}", file=sys.stderr)
    sys.exit(1)

print(response.text)
"@ 2>&1

    if ($LASTEXITCODE -ne 0) {
        throw "$registrationResponseJson"
    }

    $registrationResponse = $registrationResponseJson | ConvertFrom-Json
}
catch {
    throw "Cihaz kaydi basarisiz oldu. API cevabi: $_"
}
finally {
    Remove-Item Env:\OTOLOGIN_REGISTRATION_API -ErrorAction SilentlyContinue
    Remove-Item Env:\OTOLOGIN_REGISTRATION_BODY -ErrorAction SilentlyContinue
}

$workerConfig = @{
    api_base_url = $registrationResponse.worker_config.api_base_url
    device_id = $registrationResponse.worker_config.device_id
    machine_key = $registrationResponse.worker_config.machine_key
    window_count = $registrationResponse.worker_config.window_count
    health_check_interval_sec = $registrationResponse.worker_config.health_check_interval_sec
    reconnect_cooldown_sec = $registrationResponse.worker_config.reconnect_cooldown_sec
    exe_path = $registrationResponse.worker_config.exe_path
    launch_args = @(ConvertTo-StringArray $registrationResponse.worker_config.launch_args)
}

$workerConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8

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
Write-Host "Cihaz kimligi: $($registrationResponse.device.id)" -ForegroundColor White
Write-Host "worker-config.json otomatik yazildi ve Startup kisayolu olusturuldu." -ForegroundColor White
Write-Host "Simdi worker baslatiliyor..." -ForegroundColor White

Start-Process -FilePath $startupBatPath -WorkingDirectory $scriptRoot
