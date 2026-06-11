# Share CreatorFind on same WiFi — no extra software required.
# Uses Python + Node already on this machine.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# Pick first non-loopback IPv4 address
$Ip = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notmatch '^127\.' -and
        $_.IPAddress -notmatch '^169\.254\.' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } |
    Select-Object -First 1
).IPAddress

if (-not $Ip) {
    Write-Host "Could not detect local IP. Run ipconfig and use your IPv4 address manually."
    exit 1
}

$FrontendUrl = "http://${Ip}:3000"
$BackendUrl = "http://${Ip}:8000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CreatorFind — Same WiFi sharing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Send this link to your friend:" -ForegroundColor Green
Write-Host "  $FrontendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Login: demo@brand.com / demo1234" -ForegroundColor Gray
Write-Host ""
Write-Host "  Requirements:" -ForegroundColor Gray
Write-Host "  - Friend must be on the SAME WiFi as you" -ForegroundColor Gray
Write-Host "  - Keep this window open (both servers run below)" -ForegroundColor Gray
Write-Host ""

$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

# Backend
Write-Host "Starting backend on $BackendUrl ..."
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$BackendDir'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

Start-Sleep -Seconds 4

# Frontend with public API URL
Write-Host "Starting frontend on $FrontendUrl ..."
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$FrontendDir'; `$env:NEXT_PUBLIC_API_URL='$BackendUrl'; node 'node_modules/next/dist/bin/next' dev -p 3000 -H 0.0.0.0"
)

Write-Host ""
Write-Host "Two new terminal windows opened (backend + frontend)." -ForegroundColor Green
Write-Host "If the link does not work, check Windows Firewall allows Python/Node on private networks." -ForegroundColor Gray
Write-Host ""
