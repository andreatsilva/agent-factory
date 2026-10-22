"""Download pinned safetensors only; no repository Python or pickle weights."""
import json
import os
from pathlib import Path
import sys

os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
from huggingface_hub import snapshot_download
import torch

root = Path(__file__).resolve().parent
model = 'stable-diffusion-v1-5/stable-diffusion-v1-5'
revision = '451f4fe16113bff5a5d2269ed5ad43b0592e9a14'
if not torch.cuda.is_available():
    raise RuntimeError('CUDA GPU unavailable; image agents require a supported NVIDIA GPU.')
# Execute a CUDA kernel, not just device detection.
assert (torch.ones(4, device='cuda') * 2).sum().item() == 8
destination = root.parent / '.runtime' / 'image-models' / 'sd15'
snapshot_download(model, revision=revision, local_dir=destination,
    allow_patterns=['model_index.json', '*/config.json', '*/scheduler_config.json',
                    '*/preprocessor_config.json', 'tokenizer/*', '*.md',
                    '*/model.fp16.safetensors', '*/diffusion_pytorch_model.fp16.safetensors'])
config = dict(python=sys.executable, modelPath=str(destination), model=model,
              revision=revision, device=torch.cuda.get_device_name(0), torch=torch.__version__,
              cuda=torch.version.cuda, status='INSTALLED')
(root / 'data').mkdir(exist_ok=True)
(root / 'data' / 'image-runtime.json').write_text(json.dumps(config, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in config.items() if k not in ('python','modelPath')}))
