$ErrorActionPreference='Stop'
try{
 $result=Invoke-RestMethod http://127.0.0.1:8787/api/factory/stop -Method Post -ContentType application/json -Body '{}' -TimeoutSec 60
 Write-Host $result.message
 if(-not $result.unload.verified){Write-Warning 'Model unload was not verified. Check Ollama before gaming.'}
}catch{
 Write-Warning 'Factory server is unavailable; requesting model unload directly.'
 foreach($model in @('qwen3:8b','qwen2.5-coder:7b')){
  $body=@{model=$model;keep_alive=0;stream=$false}|ConvertTo-Json
  $null=Invoke-RestMethod http://127.0.0.1:11434/api/generate -Method Post -ContentType application/json -Body $body -TimeoutSec 30
 }
}
