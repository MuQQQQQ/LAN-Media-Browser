param(
    [string]$BaseFolder = "D:\Media",
    [switch]$UseProxy
)

$ErrorActionPreference = "Stop"
$ProxyUrl = "http://127.0.0.1:10809"

Write-Host "Checking Node.js and npm..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed. Install the Windows LTS version from https://nodejs.org/ then rerun this script."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is not installed or not on PATH. Reinstall Node.js LTS from https://nodejs.org/."
}
node -v
npm -v

if ($UseProxy) {
    Write-Host "Configuring npm proxy: $ProxyUrl"
    npm config set proxy $ProxyUrl
    npm config set https-proxy $ProxyUrl
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

$escapedBase = $BaseFolder -replace '\\', '\\'
$envText = Get-Content ".env" -Raw
$envText = $envText -replace '(?m)^BASE_FOLDER=.*$', "BASE_FOLDER=$escapedBase"
Set-Content ".env" $envText -Encoding UTF8

Write-Host "Installing root tooling..."
npm install
Write-Host "Installing server dependencies..."
Push-Location server
npm install
Pop-Location
Write-Host "Installing client dependencies..."
Push-Location client
npm install
Pop-Location

Write-Host "Setup complete. Edit .env if needed, then run: .\scripts\start.ps1"