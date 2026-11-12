param([switch]$Publish)
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$guard=[Threading.Mutex]::new($false,'Local\NEOFactoryLive')
try{$ownsGuard=$guard.WaitOne(0)}catch [Threading.AbandonedMutexException]{$ownsGuard=$true}
if(!$ownsGuard){$guard.Dispose();return}
try{
 $node=(Get-Command node -ErrorAction Stop).Source
 $runtime=Join-Path (Split-Path $PSScriptRoot) '.runtime'
 $ollama=Join-Path $runtime 'ollama\ollama.exe'
 $cloudflare=Join-Path $PSScriptRoot 'data\tools\cloudflared.exe'
 $github=(Get-Command gh -ErrorAction Stop).Source
 $statePath=Join-Path $PSScriptRoot 'data\viewer-session.json'
 function Read-Endpoint($url){
  try { Invoke-RestMethod $url -TimeoutSec 5 }catch { $null }
 }
 function Start-Local($name,$file,$arguments){
  Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput "data/$name-out.log" -RedirectStandardError "data/$name-error.log" -PassThru
 }
 function Wait-Endpoint($url){
  for($i=0;$i -lt 20;$i++){
   $result=Read-Endpoint $url
   if($null -ne $result){return $result}
   Start-Sleep -Seconds 1
  }
  throw "Service unavailable at $url"
 }
 $env:OLLAMA_MODELS=Join-Path $runtime 'models'
 $env:OLLAMA_HOST='127.0.0.1:11434'
 $env:OLLAMA_MAX_LOADED_MODELS='1'
 if(!(Read-Endpoint 'http://127.0.0.1:11434/api/tags')){
  $null=Start-Local 'ollama-live' $ollama @('serve')
  $null=Wait-Endpoint 'http://127.0.0.1:11434/api/tags'
 }
 if(!(Read-Endpoint 'http://127.0.0.1:8787/api/status')){
  $null=Start-Local 'factory-live' $node @('--env-file-if-exists=.env','server.mjs')
  $null=Wait-Endpoint 'http://127.0.0.1:8787/api/status'
 }
 if(!(Read-Endpoint 'http://127.0.0.1:8788/snapshot')){
  $null=Start-Local 'viewer' $node @('--env-file-if-exists=.env','viewer-server.mjs')
  $null=Wait-Endpoint 'http://127.0.0.1:8788/snapshot'
 }
 $tunnelLog=Join-Path $PSScriptRoot 'data\tunnel-error.log'
 function Get-TunnelAddress {
  if(Test-Path $tunnelLog){[regex]::Match([string](Get-Content $tunnelLog -Raw),'https://[a-z0-9-]+\.trycloudflare\.com').Value}
 }
 $address=Get-TunnelAddress
 $tunnelId=$null
 if(Test-Path $statePath){$tunnelId=(Get-Content $statePath -Raw|ConvertFrom-Json).tunnel}
 $existing=if($tunnelId){Get-Process -Id $tunnelId -ErrorAction SilentlyContinue}
 if(!$existing -or $existing.Path -ne $cloudflare){
  $tunnel=Start-Local 'tunnel' $cloudflare @('tunnel','--url','http://127.0.0.1:8788','--protocol','http2')
  $tunnelId=$tunnel.Id
  $address=$null
  for($i=0;$i -lt 30 -and !$address;$i++){Start-Sleep -Seconds 1;$address=Get-TunnelAddress}
 }
 if(!$address){throw 'Cloudflare did not allocate a tunnel address'}
 $null=Wait-Endpoint "$address/snapshot"
 $catalog=Wait-Endpoint "$address/products"
 $listener={param($port)(Get-NetTCPConnection -LocalPort $port -State Listen | Select-Object -First 1).OwningProcess}
 @{factory=(& $listener 8787);viewer=(& $listener 8788);ollama=(& $listener 11434);tunnel=$tunnelId;updatedAt=(Get-Date).ToUniversalTime().ToString('o')}|ConvertTo-Json|Set-Content $statePath
 $url="$address/snapshot"
 $repo='andreatsilva/agent-factory'
 $current=& $github variable get FACTORY_FEED_URL --repo $repo 2>$null
 $published=$null
 try{
  $site='https://andreatsilva.github.io/agent-factory/'
  $page=(Invoke-WebRequest -UseBasicParsing ($site+'?liveCheck='+[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) -TimeoutSec 10).Content
  $config=[regex]::Match($page,'\./viewer-config\.mjs\?v=[a-f0-9]+').Value
  if($config){$published=(Invoke-WebRequest -UseBasicParsing ($site+$config.Substring(2)) -TimeoutSec 10).Content}
 }catch{}
 if($current -ne $url -or !$published -or !$published.Contains('"feedUrl":"'+$url+'"') -or $Publish){
  & $github variable set FACTORY_FEED_URL --repo $repo --body $url
  if($LASTEXITCODE -ne 0){throw 'Could not save the GitHub Pages feed URL'}
  & $github workflow run pages.yml --repo $repo --ref main
  if($LASTEXITCODE -ne 0){throw 'Could not publish the GitHub Pages feed URL'}
 }
 Write-Output "Gateway online. Catalog contains $($catalog.total) completed products."
}finally{
 $guard.ReleaseMutex()
 $guard.Dispose()
}
