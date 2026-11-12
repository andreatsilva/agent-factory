import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';

export const OFFLOAD_MODEL='qwen3.5:35b (CPU experts)';

export function createNeoOffload({executable,weights,expertLayers=32,minFreeGiB=19,port=8793}={}){
 const origin='http://127.0.0.1:'+port;
 const configured=Boolean(executable&&weights&&existsSync(executable)&&existsSync(weights));
 const available=()=>configured&&os.freemem()/1024**3>=minFreeGiB;
 async function generate({prompt,system,schema,maxTokens=1200,temperature=.25,signal}){
  if(!available())throw Error('Insufficient free RAM for CPU expert offload');
  const timeout=AbortSignal.timeout(180000);
  const pressure=new AbortController();
  const combined=AbortSignal.any([timeout,pressure.signal,...(signal?[signal]:[])]);
  combined.throwIfAborted();
  // Refuse to contact an unrelated listener on the reserved loopback port.
  const occupied=await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)}).then(()=>true,()=>false);
  if(occupied)throw Error('NEO inference port is occupied');
  const started=Date.now();
  const worker=spawn(executable,['--model',weights,'--host','127.0.0.1','--port',String(port),'--ctx-size','4096',
   '--n-cpu-moe',String(expertLayers),'--n-gpu-layers','auto','--parallel','1','--reasoning','off','--poll','0','--no-webui'],
   {windowsHide:true,stdio:['ignore','ignore','pipe']});
  let closed=false,diagnostics='';
  const gpuMemory=[];
  const monitor=setInterval(()=>{if(os.freemem()/1024**3<1.5)pressure.abort(Error('35B stopped to preserve system RAM'));},500);
  const exit=new Promise(resolve=>{
   worker.once('error',error=>{diagnostics=error.message;});
   worker.once('close',()=>{closed=true;resolve();});
  });
  worker.stderr.on('data',chunk=>{
   diagnostics=(diagnostics+chunk).slice(-5000);
   for(const line of String(chunk).split(/\r?\n/))if(/model buffer size|offloaded .*layers|compute buffer size/i.test(line)&&gpuMemory.length<12)gpuMemory.push(line.trim());
  });
  const stop=()=>{if(!closed)worker.kill();};
  combined.addEventListener('abort',stop,{once:true});
  try{
   for(;;){
    combined.throwIfAborted();
    if(closed)throw Error('llama.cpp could not load the model: '+diagnostics.split(/\r?\n/).filter(Boolean).at(-1));
    const ready=await fetch(origin+'/health',{signal:AbortSignal.any([combined,AbortSignal.timeout(2000)])}).then(r=>r.ok,()=>false);
    if(ready)break;
    await delay(500,null,{signal:combined});
   }
   const loadSeconds=(Date.now()-started)/1000;
   const response=await fetch(origin+'/v1/chat/completions',{method:'POST',signal:combined,headers:{'Content-Type':'application/json'},body:JSON.stringify({
    model:OFFLOAD_MODEL,messages:[{role:'system',content:system},{role:'user',content:prompt}],
    max_tokens:maxTokens,temperature,stream:false,
    ...(schema?{response_format:{type:'json_schema',json_schema:{name:'factory_brief',strict:true,schema}}}:{})
   })});
   if(!response.ok)throw Error('llama.cpp inference HTTP '+response.status);
   const output=await response.json(),answer=output.choices?.[0]?.message?.content;
   if(!answer?.trim()||output.choices[0].finish_reason==='length')throw Error('Incomplete 35B response');
   return {answer,loadSeconds,gpuMemory,inputTokens:output.usage?.prompt_tokens||0,outputTokens:output.usage?.completion_tokens||0,tokensPerSecond:output.timings?.predicted_per_second||null};
  }finally{
   clearInterval(monitor);
   combined.removeEventListener('abort',stop);
   stop();
   await exit;
  }
 }
 return {configured,available,generate};
}
