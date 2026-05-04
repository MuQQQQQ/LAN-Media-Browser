param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Edit BASE_FOLDER before using real media."
}

if ($Dev) {
    npm run dev
} else {
    npm run build
    npm run start
}