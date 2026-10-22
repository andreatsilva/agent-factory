import {spawn} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {randomInt} from 'node:crypto';
const worker=fileURLToPath(new URL('./image-worker.py',import.meta.url));
export function createImageBackend({dataDir,spawnProcess=spawn,timeoutMs=240000}={}){
 let busy=false,lastError=null;
 function config(){try{const c=JSON.parse(readFileSync(join(dataDir,'image-runtime.json'),'utf8'));return c.status==='INSTALLED'&&existsSync(c.python)&&existsSync(join(c.modelPath,'model_index.json'))?c:null;}catch{return null;}}
 function overview(){const c=config();return {status:busy?'GENERATING':c?'READY':'NOT_INSTALLED',model:c?.model||null,revision:c?.revision||null,device:c?.device||null,busy,lastError};}
 async function generate(prompt,signal){
  signal?.throwIfAborted();if(busy)throw Error('Image worker is already busy');
  const c=config();if(!c)throw Error('Local image model is not installed. Run setup_image_ai.ps1.');
  if(typeof prompt!=='string'||prompt.length<3||prompt.length>600)throw Error('Invalid image prompt');
  busy=true;lastError=null;const seed=randomInt(0,2147483647);
  try{return await new Promise((resolve,reject)=>{
   const child=spawnProcess(c.python,[worker],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'}});
   let output='',errors='',failure;const stop=reason=>{failure=reason;child.kill();};
   const abort=()=>stop(signal.reason||Error('Image generation cancelled'));
   const timer=setTimeout(()=>stop(Error('Image generation timed out')),timeoutMs);
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
   child.stdout.on('data',data=>{output+=data;if(output.length>8*1024*1024)stop(Error('Image output exceeded limit'));});
   child.stderr.on('data',data=>{errors=(errors+data).slice(-3000);});
   child.on('error',error=>{failure=error;});child.stdin.on('error',error=>{failure||=error;});
   child.on('close',code=>{
    clearTimeout(timer);signal?.removeEventListener('abort',abort);
    if(failure||code!==0)return reject(failure||Error('Local image generation failed: '+errors.slice(-800)));
    try{const r=JSON.parse(output),png=Buffer.from(r.png,'base64');if(png.length<100||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid image output');resolve({png,metadata:{model:c.model,revision:c.revision,seed,prompt,width:r.width,height:r.height,steps:25,seconds:r.seconds,license:'CreativeML OpenRAIL-M',safetyChecked:true}});}catch(e){reject(e);}
   });
   child.stdin.end(JSON.stringify({modelPath:c.modelPath,prompt,seed}));
  });}catch(e){lastError=signal?.aborted?'Cancelled':e.message;throw e;}finally{busy=false;}
 }
 return {overview,generate};
}
