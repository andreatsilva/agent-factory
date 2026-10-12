$ErrorActionPreference='Stop'
$runtime=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.runtime'))
$exe=Join-Path $runtime 'ollama/ollama.exe'
New-Item -ItemType Directory -Force $runtime | Out-Null
if(-not(Test-Path $exe)){
 $asset=(Invoke-RestMethod https://api.github.com/repos/ollama/ollama/releases/latest).assets | Where-Object name -eq 'ollama-windows-amd64.zip'
 if(-not $asset){throw 'Official Ollama Windows release was not found'}
 Write-Host 'Downloading official portable Ollama…'
 $zip=Join-Path $runtime 'ollama.zip'
 Invoke-WebRequest $asset.browser_download_url -OutFile $zip
 Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $runtime 'ollama') -Force
}
$env:OLLAMA_MODELS=Join-Path $runtime 'models';$env:OLLAMA_HOST='127.0.0.1:11434';$env:OLLAMA_MAX_LOADED_MODELS='1'
try{$null=Invoke-RestMethod http://127.0.0.1:11434/api/tags -TimeoutSec 2}catch{Start-Process -FilePath $exe -ArgumentList 'serve' -WindowStyle Hidden;Start-Sleep -Seconds 3}
$neoModel=if($env:NEO_MODEL){$env:NEO_MODEL}else{'qwen3:8b'}
$coderModel=if($env:CODER_MODEL){$env:CODER_MODEL}else{'qwen2.5-coder:7b'}
foreach($model in @($neoModel,$coderModel)){
 & $exe pull $model
 if($LASTEXITCODE -ne 0){throw "Model download failed: $model"}
}
Write-Host 'LOCAL AI READY — run start_factory.bat'
