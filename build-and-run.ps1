# Build Goonopticon Desktop and run the exe.
# Run from project root: .\build-and-run.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "Building..." -ForegroundColor Cyan
npm run build:exe
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

$exePath = $null
$inRoot = Get-ChildItem -Path $root -Filter "*.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if ($inRoot) {
    $exePath = $inRoot.FullName
} else {
    $unpacked = Join-Path $root "dist\win-unpacked"
    if (Test-Path $unpacked) {
        $inDist = Get-ChildItem -Path $unpacked -Filter "*.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($inDist) { $exePath = $inDist.FullName }
    }
}
if (-not $exePath) {
    Write-Host "No .exe found in root or dist\win-unpacked." -ForegroundColor Red
    exit 1
}

Write-Host "Running $exePath" -ForegroundColor Green
Start-Process -FilePath $exePath
