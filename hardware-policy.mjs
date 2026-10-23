import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),GiB=1024**3;
export async function detectHardware(){
 let gpu=null;
 try{const {stdout}=await exec('nvidia-smi',['--query-gpu=name,memory.total','--format=csv,noheader,nounits'],{timeout:4000,windowsHide:true});const rows=stdout.trim().split(/\r?\n/).map(line=>{const parts=line.split(',');return {name:parts[0].trim(),vramGiB:Number(parts[1])/1024};});gpu=rows.sort((a,b)=>b.vramGiB-a.vramGiB)[0]||null;}catch{}
 return {ramGiB:os.totalmem()/GiB,freeGiB:os.freemem()/GiB,cpuThreads:os.availableParallelism(),gpu,detectedAt:Date.now()};
}
export function capacityFor(h){
 const ram=Math.max(1,h.ramGiB||1),cpu=Math.max(1,h.cpuThreads||1),gpu=h.gpu?.vramGiB||0;
 const lanes=Math.max(1,Math.min(4,Math.floor(cpu/4),Math.floor((ram-6)/6)));
 return {lanes,maxAgents:Math.min(124,18+Math.floor(cpu/4)*12+Math.floor(ram/8)*6),inferenceSlots:1,
  modelBudgetGiB:Math.max(.5,gpu?Math.min(gpu*.8,gpu-1.5,ram*.4):Math.max(.5,(ram-6)*.45)),
  pressure:h.freeGiB<Math.max(2,ram*.08),imageBackend:'VECTOR_AND_CANVAS',
  imageNote:'Text-led thumbnails and SVG logos. No diffusion image model connected.'};
}
export function routeModels(models,hardware,{neo='qwen3:8b',coder='qwen2.5-coder:7b'}={}){
 const budget=capacityFor(hardware).modelBudgetGiB;
 const text=models.filter(m=>/^qwen3(?:\.5)?:(?:0\.6|0\.8|1\.7|2|4|8|9|14|27|32)b(?:$|-)/i.test(m.name)&&m.size/GiB<=budget).sort((a,b)=>parseFloat(a.name.split(':')[1])-parseFloat(b.name.split(':')[1])||a.size-b.size);
 const code=models.filter(m=>/^qwen2\.5-coder:/.test(m.name)&&m.size/GiB<=budget).sort((a,b)=>b.size-a.size);
 const has=name=>models.some(m=>m.name===name&&m.size/GiB<=budget);
 const high=text.at(-1)?.name||(has(neo)?neo:null);
 const coderModel=code[0]?.name||(has(coder)?coder:high);
 return {simple:text[0]?.name||high,medium:text.filter(m=>parseFloat(m.name.split(':')[1])>=3&&parseFloat(m.name.split(':')[1])<=4).at(-1)?.name||coderModel,code:coderModel,high,image:'local-vector/canvas'};
}
export function workerModelAssignment(w,models){
 const tier=w.active_task&&w.modelTier?w.modelTier:['apps','website'].includes(w.home)?'code':['logos','thumbnails'].includes(w.home)?'medium':['product','quality','automation','ops'].includes(w.home)?'deterministic':'simple';
 return {modelTier:tier,assignedModel:tier==='deterministic'?'Local code / checks':models[tier]||null,team:w.home};
}
export async function readGpuRuntime(){
 const {stdout}=await exec('nvidia-smi',['--query-gpu=name,utilization.gpu,memory.used,memory.total,power.draw','--format=csv,noheader,nounits'],{timeout:3000,windowsHide:true});
 const [name,utilization,used,total,power]=stdout.trim().split(/\r?\n/)[0].split(',').map(s=>s.trim());
 return {name,utilizationPercent:Number(utilization),usedGiB:Number(used)/1024,totalGiB:Number(total)/1024,powerWatts:Number(power),sampledAt:Date.now()};
}
export function createHardwareManager({request=fetch,ollama,read=detectHardware,readRuntime=readGpuRuntime,save=()=>{},log=()=>{},defaults={},imageStatus=()=>null}){
 let state={hardware:null,capacity:{lanes:1,maxAgents:36,inferenceSlots:1,pressure:false},models:{simple:defaults.neo||'qwen3:8b',medium:defaults.coder||'qwen2.5-coder:7b',code:defaults.coder||'qwen2.5-coder:7b',high:defaults.neo||'qwen3:8b',image:'local-vector/canvas'},status:'DETECTING'},pending=null;
 const refresh=()=>pending||(pending=(async()=>{
  const hardware=await read();const r=await request(ollama+'/api/tags',{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Model inventory unavailable');
  const tags=await r.json(),capacity=capacityFor(hardware),models=routeModels(tags.models||[],hardware,defaults);
  const image=imageStatus();if(image?.model&&['READY','GENERATING'].includes(image.status)){models.image=image.model;capacity.imageBackend='LOCAL_DIFFUSION';capacity.imageNote='Stable Diffusion image worker; one GPU job at a time. Text and layout composed locally.';}
  const changed=state.hardware&&JSON.stringify([state.capacity.lanes,state.capacity.maxAgents,state.models])!==JSON.stringify([capacity.lanes,capacity.maxAgents,models]);
  state={hardware,capacity,models,image,status:models.high?'READY':'MODEL_REQUIRED'};save(state);
  if(changed)log('NEO // hardware capacity updated: '+capacity.lanes+' lanes · '+capacity.maxAgents+' agent ceiling');
  return state;
 })().catch(e=>{state={...state,status:'UNAVAILABLE',error:e.message};return state;}).finally(()=>pending=null));
 let runtime={gpu:null,loaded:[],lastInference:null,active:null},runtimePending=null;
 const refreshRuntime=()=>runtimePending||(runtimePending=(async()=>{
  const [gpu,ps]=await Promise.allSettled([readRuntime(),request(ollama+'/api/ps',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)throw Error('Ollama telemetry unavailable');return r.json();})]);
  runtime.gpu=gpu.status==='fulfilled'?gpu.value:null;
  runtime.loaded=ps.status==='fulfilled'?(ps.value.models||[]).map(m=>({model:m.name,totalBytes:m.size,gpuBytes:m.size_vram,context:m.context_length,gpuMemoryPercent:m.size>0&&Number.isFinite(m.size_vram)?Math.round(m.size_vram/m.size*100):null})):[];
  if(runtime.active&&runtime.gpu)runtime.active.peakGpuPercent=Math.max(runtime.active.peakGpuPercent||0,runtime.gpu.utilizationPercent||0);
 })().finally(()=>runtimePending=null));
 return {refresh,refreshRuntime,overview:()=>structuredClone({...state,runtime}),model:tier=>state.models[tier],
  beginInference:(model,tier)=>{runtime.active={model,tier,startedAt:Date.now(),peakGpuPercent:0};},
  finishInference:out=>{if(runtime.active)runtime.lastInference={...runtime.active,...out,finishedAt:Date.now()};runtime.active=null;}};
}
