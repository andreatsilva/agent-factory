"""One private stdin/stdout job. Process exit releases all GPU allocations."""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
import base64
import io
import json
import sys
import time
import torch
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

job = json.loads(sys.stdin.buffer.read(16384))
prompt = job['prompt']
if not isinstance(prompt, str) or not 3 <= len(prompt) <= 600:
    raise ValueError('Invalid image prompt')
started = time.monotonic()
pipe = StableDiffusionPipeline.from_pretrained(job['modelPath'], torch_dtype=torch.float16,
    variant='fp16', use_safetensors=True, local_files_only=True)
if pipe.safety_checker is None:
    raise RuntimeError('Image safety checker is missing')
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.to('cuda')
pipe.enable_vae_slicing()
result = pipe(prompt, negative_prompt='text, letters, watermark, logo, blurry, low quality, distorted',
    width=768, height=432, num_inference_steps=25, guidance_scale=7.0,
    generator=torch.Generator(device='cuda').manual_seed(int(job['seed'])))
if any(result.nsfw_content_detected or []):
    raise RuntimeError('Image requires a different safe brief; no artifact published')
stream = io.BytesIO()
result.images[0].save(stream, format='PNG')
print(json.dumps(dict(png=base64.b64encode(stream.getvalue()).decode(),
    seconds=round(time.monotonic()-started, 2), width=768, height=432, seed=job['seed'])))
