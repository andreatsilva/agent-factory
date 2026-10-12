$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22.13 or newer from https://nodejs.org first.' }
& node --input-type=module -e "import('@napi-rs/canvas').then(()=>process.exit(0)).catch(()=>process.exit(1))"
if ($LASTEXITCODE -ne 0) {
 $npmCli=Join-Path (Split-Path (Get-Command node).Source) 'node_modules/npm/bin/npm-cli.js'
 Write-Host 'Installing locked local thumbnail renderer dependencies...'
 if(Test-Path $npmCli){ & node $npmCli ci --ignore-scripts --no-fund --no-audit }
 else { & npm.cmd ci --ignore-scripts --no-fund --no-audit }
 if($LASTEXITCODE -ne 0){throw 'Renderer dependency installation failed. Run npm ci, then start again.'}
}
$portable=Join-Path $PSScriptRoot '../.runtime/ollama/ollama.exe'
$ollamaCommand=Get-Command ollama -ErrorAction SilentlyContinue
$ollamaExecutable=if(Test-Path $portable){$portable}elseif($ollamaCommand){$ollamaCommand.Source}else{$null}
try { $null=Invoke-RestMethod http://127.0.0.1:11434/api/tags -TimeoutSec 2 } catch {
 if($ollamaExecutable){
  if(Test-Path $portable){$env:OLLAMA_MODELS=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.runtime/models'))}
  $env:OLLAMA_HOST='127.0.0.1:11434';$env:OLLAMA_MAX_LOADED_MODELS='1'
  Start-Process -FilePath $ollamaExecutable -ArgumentList 'serve' -WindowStyle Hidden
 } else {Write-Host 'Ollama is missing. Run setup_local_ai.bat for local AI.'}
}
Write-Host 'Factory: http://127.0.0.1:8787  |  Press Ctrl+C to close the server.'
& node --env-file-if-exists=.env server.mjs
exit $LASTEXITCODE
