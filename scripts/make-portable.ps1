$ErrorActionPreference = 'Stop'

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outRoot = Join-Path $root "download\morries-reminder-portable-$stamp"
$appDir = Join-Path $outRoot 'Morries Reminder'
$electronDist = Join-Path $root 'node_modules\electron\dist'
$appResourceDir = Join-Path $appDir 'resources\app'
$zipPath = Join-Path $outRoot 'Morries Reminder Portable.zip'
$latestZipPath = Join-Path $root 'download\Morries Reminder Portable.zip'

if (-not (Test-Path -LiteralPath (Join-Path $electronDist 'electron.exe'))) {
  throw "Electron runtime was not found at $electronDist. Run npm install first."
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
Copy-Item -Path (Join-Path $electronDist '*') -Destination $appDir -Recurse -Force

$exePath = Join-Path $appDir 'electron.exe'
$dailyExePath = Join-Path $appDir 'Morries Reminder.exe'
if (Test-Path -LiteralPath $exePath) {
  Move-Item -LiteralPath $exePath -Destination $dailyExePath -Force
}

New-Item -ItemType Directory -Path $appResourceDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'dist') -Destination $appResourceDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'electron') -Destination $appResourceDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'src') -Destination $appResourceDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'public') -Destination $appResourceDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'package.json') -Destination $appResourceDir -Force

Compress-Archive -LiteralPath $appDir -DestinationPath $zipPath -Force
$latestZipUpdated = $true
try {
  Copy-Item -LiteralPath $zipPath -Destination $latestZipPath -Force
} catch {
  $latestZipUpdated = $false
  Write-Warning "Could not update latest portable zip at $latestZipPath. It may be open in another app. Use the timestamped zip instead."
}

Write-Output "Portable app folder: $appDir"
Write-Output "Portable zip: $zipPath"
if ($latestZipUpdated) {
  Write-Output "Latest portable zip: $latestZipPath"
}
