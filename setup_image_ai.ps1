param([string]$Python='python')
$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$runtime=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.runtime/image-ai'))
if(-not(Test-Path "$runtime/Scripts/python.exe")){
 & $Python -m venv $runtime
 if($LASTEXITCODE -ne 0){throw 'Python 3.10–3.13 is required. Pass -Python with its executable path.'}
}
$imagePython=Join-Path $runtime 'Scripts/python.exe'
& $imagePython -m pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128 --no-cache-dir
if($LASTEXITCODE -ne 0){throw 'CUDA runtime installation failed'}
& $imagePython -m pip install -r image-requirements.txt --no-cache-dir
if($LASTEXITCODE -ne 0){throw 'Image dependencies installation failed'}
& $imagePython setup_image_model.py
if($LASTEXITCODE -ne 0){throw 'Image model installation failed'}
Write-Host 'Image agents installed. Restart the factory to pick up the renderer.'
