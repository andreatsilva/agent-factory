// Explicit public schema. Never spread database records into this response.
import {DEPARTMENTS,FACTORY_MODULES} from './factory-modules.mjs';
import {positionAt} from './workers.mjs';
const number=(v,max=1e7)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
const count=v=>Math.floor(number(v));
const key=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(v)?v:'';
const state=v=>['IDLE','WORKING','INSPECTING','STOPPED','OFFLINE','ERROR'].includes(v)?v:'IDLE';
const point=p=>({x:Number.isFinite(p?.x)?Math.max(-10000,Math.min(10000,p.x)):640,y:Number.isFinite(p?.y)?Math.max(-10000,Math.min(10000,p.y)):348});
// Workstation counters can grow during long tasks; 24 preserves both 12-slot
// room placement and the 24-slot NEO landing while keeping public values small.
export function sanitizeSnapshot(input){
 if(input?.version!==1||!Number.isFinite(input.generatedAt)||!input.layout||!Array.isArray(input.agents)||!input.counts)throw Error('Invalid public factory snapshot');
 return {version:1,generatedAt:input.generatedAt,running:input.running===true,
  layout:{revision:count(input.layout.revision),bays:(input.layout.bays||[]).slice(0,32).filter(b=>key(b.id)&&['north','south','east','west'].includes(b.side)&&['workshop','storage','servers'].includes(b.type)&&Number.isInteger(b.index)&&b.index>=0&&b.index<8).map(b=>({id:key(b.id),side:b.side,type:b.type,index:b.index,...(FACTORY_MODULES.some(m=>m.id===b.moduleId)?{moduleId:b.moduleId}:{}),...(Object.hasOwn(DEPARTMENTS,b.crewDepartment)?{crewDepartment:b.crewDepartment,crewIndex:count(b.crewIndex)}:{})}))},
  agents:input.agents.slice(0,124).filter(a=>key(a.id)&&Object.hasOwn(DEPARTMENTS,a.home)).map(a=>({id:key(a.id),home:a.home,name:DEPARTMENTS[a.home].name,role:DEPARTMENTS[a.home].name.toUpperCase(),current_room:key(a.current_room),destination:key(a.destination),state:state(a.state),health:a.health==='ok'?'ok':'attention',progress:number(a.progress,100),station_index:count(a.station_index),...(Number.isSafeInteger(a.workstation)&&a.workstation>=0?{workstation:a.workstation%24}:{}),deactivated:a.deactivated===true,route:(a.route?.length?a.route:[point(a)]).slice(0,128).map(point),started_at:number(a.started_at,1e14),speed:number(a.speed,200),...point(a)})),
  counts:Object.fromEntries(['products','ready','queued','producing','thumbnailQueued','thumbnailProducing','thumbnailReview'].map(k=>[k,count(input.counts[k])]))};
}
export function createPublicSnapshot({layout,agents,business,sales,running,time=Date.now()}){
 return sanitizeSnapshot({version:1,generatedAt:time,running,layout,agents:agents.map(a=>{const p=positionAt(a,time);return {...a,...p,route:[point(p),...p.remaining],started_at:time};}),counts:{products:business.products.length,ready:business.products.filter(p=>['READY','LISTED','SELLING'].includes(p.status)).length,queued:business.summary.queued,producing:business.products.filter(p=>['PRODUCING','QA'].includes(p.status)).length,thumbnailQueued:sales.summary.queued,thumbnailProducing:sales.summary.producing,thumbnailReview:sales.summary.review}});
}
