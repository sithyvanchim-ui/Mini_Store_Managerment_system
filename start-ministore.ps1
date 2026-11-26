# Starts MiniStoreCR: API (:8000), web (:3000), POS (:3001), and a public
# Cloudflare quick tunnel. Safe to re-run: already-running services are kept.
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File start-ministore.ps1
$ErrorActionPreference = "Continue"
$root = $PSScriptRoot
$stateDir = Join-Path $env:LOCALAPPDATA "MiniStoreCR"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$cloudflared = Join-Path $stateDir "cloudflared.exe"
$tunnelLog = Join-Path $stateDir "cloudflared.log"
$linkFile = Join-Path $root "public-link.txt"

function Test-PortUp([int]$Port) {
    return (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
}

function Start-Hidden([string]$Command, [string]$WorkingDirectory, [string]$Log) {
    Start-Process -FilePath "cmd" `
        -ArgumentList "/c", "$Command > `"$Log`" 2>&1" `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden
}

# --- API -------------------------------------------------------------------
if (Test-PortUp 8000) {
    Write-Host "API :8000 already running - skipping."
} else {
    Write-Host "Starting API on :8000 ..."
    Start-Hidden "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000" "$root\api" (Join-Path $stateDir "api.log")
}

# --- Web -------------------------------------------------------------------
if (Test-PortUp 3000) {
    Write-Host "Web :3000 already running - skipping."
} else {
    Write-Host "Starting web on :3000 ..."
    Start-Hidden "npm run dev" "$root\web" (Join-Path $stateDir "web.log")
}

# --- Standalone POS (optional) --------------------------------------------
if (Test-PortUp 3001) {
    Write-Host "POS :3001 already running - skipping."
} else {
    Write-Host "Starting POS on :3001 ..."
    Start-Hidden "npm start" "$root\pos-payment" (Join-Path $stateDir "pos.log")
}

# Wait for the website before exposing it.
for ($i = 0; $i -lt 60 -and -not (Test-PortUp 3000); $i++) { Start-Sleep -Seconds 2 }
if (-not (Test-PortUp 3000)) {
    Write-Host "Web did not start. Check: $stateDir\web.log" -ForegroundColor Red
    exit 1
}

# --- Public tunnel ---------------------------------------------------------
$urlPattern = 'https://[-a-z0-9]+\.trycloudflare\.com'
$publicUrl = $null

function Get-TunnelUrl {
    if (-not (Test-Path $tunnelLog)) { return $null }
    $match = Select-String -Path $tunnelLog -Pattern $urlPattern -ErrorAction SilentlyContinue | Select-Object -Last 1
    if ($match) { return $match.Matches.Value }
    return $null
}

function Test-PublicUrl([string]$Url) {
    if (-not $Url) { return $false }
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$Url/login" -TimeoutSec 20
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Stop-Tunnel {
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    for ($i = 0; $i -lt 10 -and (Get-Process cloudflared -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }
}

function Start-Tunnel {
    if (-not (Test-Path $cloudflared)) {
        $tempExe = Join-Path $env:TEMP "opencode\cloudflared.exe"
        if (Test-Path $tempExe) {
            Copy-Item $tempExe $cloudflared
        } else {
            Write-Host "Downloading cloudflared ..."
            Invoke-WebRequest -UseBasicParsing `
                -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
                -OutFile $cloudflared
        }
    }
    if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }
    Write-Host "Starting public tunnel ..."
    Start-Process -FilePath $cloudflared `
        -ArgumentList "tunnel", "--url", "http://localhost:3000", "--no-autoupdate", "--logfile", "`"$tunnelLog`"", "--loglevel", "info" `
        -WindowStyle Hidden

    # Wait for cloudflared to publish its quick-tunnel hostname.
    for ($i = 0; $i -lt 30 -and -not $script:publicUrl; $i++) {
        Start-Sleep -Seconds 2
        $script:publicUrl = Get-TunnelUrl
    }

    # Wait until the new hostname actually serves the site.
    for ($i = 0; $i -lt 15 -and -not (Test-PublicUrl $script:publicUrl); $i++) { Start-Sleep -Seconds 2 }
}

$publicUrl = Get-TunnelUrl
$tunnelRunning = [bool](Get-Process cloudflared -ErrorAction SilentlyContinue)

if ($tunnelRunning -and (Test-PublicUrl $publicUrl)) {
    Write-Host "Tunnel already running and reachable - reusing it."
} else {
    if ($tunnelRunning) {
        Write-Host "Tunnel is running but its link is stale - restarting it."
        Stop-Tunnel
    }
    Start-Tunnel
    $publicUrl = Get-TunnelUrl
}


# --- Report ----------------------------------------------------------------
$lanIp = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Select-Object -First 1

$mdnsName = "$($env:COMPUTERNAME.ToLower()).local"
$qrFile = Join-Path $root "public-link-qr.png"

if ($publicUrl) {
    Push-Location (Join-Path $root "web")
    $qrPath = $qrFile -replace '\\', '/'
    node -e "const QRCode=require('qrcode');QRCode.toFile('$qrPath','$publicUrl',{width:480,margin:2},e=>{if(e)process.exit(1)})" 2>$null
    Pop-Location
}

$lines = @(
    "MiniStoreCR links - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "",
    "This PC:      http://localhost:3000",
    "Same Wi-Fi:   http://${lanIp}:3000",
    "mDNS:         http://${mdnsName}:3000",
    "Any internet: $(if ($publicUrl) { $publicUrl } else { 'tunnel starting - run this script again in ~20s' })",
    "",
    "Phone QR:     public-link-qr.png",
    "",
    "Login: admin@ministore.local / Admin123!"
)
$lines | Set-Content -Path $linkFile -Encoding utf8
$lines | Write-Host

Write-Host ""
Write-Host "Saved to: $linkFile" -ForegroundColor Green
if (-not $publicUrl) {
    Write-Host "Public URL not captured yet. Check $tunnelLog" -ForegroundColor Yellow
}
