# Share CreatorFind publicly via ngrok Python library (pip only — no app install)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backend = Join-Path $Root "backend"

if (-not $env:NGROK_AUTHTOKEN) {
    Write-Host ""
    Write-Host "Set your ngrok token first:" -ForegroundColor Yellow
    Write-Host "  1. Sign up free: https://dashboard.ngrok.com/signup"
    Write-Host "  2. Copy token:  https://dashboard.ngrok.com/get-started/your-authtoken"
    Write-Host "  3. Run:         `$env:NGROK_AUTHTOKEN='paste_token_here'"
    Write-Host "  4. Then run this script again."
    Write-Host ""
    exit 1
}

Write-Host "Installing ngrok Python library if needed..."
pip install ngrok -q

Set-Location $Backend
python scripts/share_public.py
