$ErrorActionPreference='Stop'
$sessionPath=Join-Path $PSScriptRoot 'data/viewer-session.json'
if (-not (Test-Path -LiteralPath $sessionPath)) { Write-Host 'No managed public-view session recorded.'; exit 0 }
$session=Get-Content -LiteralPath $sessionPath -Raw | ConvertFrom-Json
foreach ($entry in @(@{Id=$session.tunnelPid;Pattern='cloudflared\.exe.*tunnel.*--url\s+http://127\.0\.0\.1:8788'},@{Id=$session.viewerPid;Pattern='node\.exe.*viewer-server\.mjs'})) {
 if (-not $entry.Id) { continue }
 $process=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$entry.Id)
 if ($process -and $process.CommandLine -match $entry.Pattern) { Stop-Process -Id $process.ProcessId; Write-Host ('Stopped public-view process '+$process.ProcessId) }
 elseif ($process) { Write-Warning ('Process '+$entry.Id+' no longer matches this public-view session; left untouched.') }
}
Write-Host 'Public viewer stopped. The local factory remains available.'
