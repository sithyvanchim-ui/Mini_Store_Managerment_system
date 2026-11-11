# Starts the MiniStore system: API on :8000 then frontend on :3000.
# Safe to re-run: skips servers that are already listening on their port.
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File start-ministore.ps1
$root = "D:\MiniStore_management_system"

function Test-PortUp([int]$Port) {
    return (Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
}

if (Test-PortUp 8000) {
    Write-Host "API :8000 already running - skipping."
} else {
    Write-Host "Starting API on :8000 ..."
    Start-Process -FilePath "uv" `
        -ArgumentList "run","uvicorn","app.main:app","--port","8000" `
        -WorkingDirectory "$root\api" -WindowStyle Hidden `
        -RedirectStandardOutput "$root\api\uv-out.log" `
        -RedirectStandardError "$root\api\uv-err.log"
    Start-Sleep -Seconds 8
}

if (Test-PortUp 3000) {
    Write-Host "Frontend :3000 already running - skipping."
} else {
    Write-Host "Starting frontend on :3000 ..."
    Start-Process -FilePath "cmd" `
        -ArgumentList "/c","npm run dev > $root\next-dev.log 2>&1" `
        -WorkingDirectory "$root\web" -WindowStyle Hidden
    Start-Sleep -Seconds 12
}

$api = Test-PortUp 8000
$web = Test-PortUp 3000
Write-Host "API :8000 = $api"
Write-Host "Web :3000 = $web"
Write-Host ""
Write-Host "Open:  http://localhost:3000          (on this PC)"
Write-Host "  or:  http://192.168.102.1:3000     (on phone / other devices)"
Write-Host "Login: admin@ministore.local / Admin123!"
