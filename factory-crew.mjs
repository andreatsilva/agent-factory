import {FACTORY_MODULES,DEPARTMENTS,MAX_AGENTS} from './factory-modules.mjs';
import {WORKSTATIONS,visitStation,positionAt,freezeWorker,registerModuleRoutes} from './workers.mjs';
import {bayRooms,nextBay,emptyLayout} from './layout.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const fault=(status,message)=>Object.assign(Error(message),{status});
export function createFactoryCrew({workers,saveWorker,isRunning,log,fast=false,getLayout=emptyLayout,saveLayout=()=>{}}){
 function make(id,home,name,index){const p=WORKSTATIONS[home][index%WORKSTATIONS[home].length];const w={id,name,role:name.toUpperCase(),home,current_room:home,destination:home,state:'IDLE',route:[p],x:p.x,y:p.y,started_at:Date.now(),speed:100,station_index:index,active_task:null,progress:0,health:'ok',capabilities:[DEPARTMENTS[home].capability],jobsCompleted:0,managed:true,task_description:'Available for '+DEPARTMENTS[home].name};return isRunning()?w:freezeWorker(w);}
 for(const m of FACTORY_MODULES)for(const [i,[id,name]] of m.crew.entries())if(!workers().some(w=>w.id===id))saveWorker({...make(id,m.id,name,i),coreModule:true});
 // Reconcile unfinished visual assignments against recovered SQLite queue state.
 for(const w of workers().filter(w=>w.active_task?.startsWith('sales:')))saveWorker({...w,active_task:null,state:isRunning()?'IDLE':'STOPPED',resume_state:'IDLE',task_description:'Recovered sales task; queued for resume'});
 function overview(){const all=workers();return {limit:MAX_AGENTS,total:all.length,active:all.filter(w=>!w.deactivated).length,departments:Object.entries(DEPARTMENTS).map(([id,d])=>({id,name:d.name,total:all.filter(w=>w.home===id).length,active:all.filter(w=>w.home===id&&!w.deactivated).length,busy:all.filter(w=>w.home===id&&!w.deactivated&&w.active_task&&!w.inspection).length}))};}
 function resize({department,target}){
  if(!DEPARTMENTS[department]||!Number.isInteger(target)||target<0||target>MAX_AGENTS)throw fault(400,'Choose a department and whole-number target from 0 to 124');
  const all=workers(),team=all.filter(w=>w.home===department),live=team.filter(w=>!w.deactivated),delta=target-live.length;
  if(overview().active+delta>MAX_AGENTS)throw fault(409,'Factory limit is 124 active agents');
  if(delta<0){const removable=live.filter(w=>(w.managed||w.dynamic)&&!w.coreModule&&!w.active_task);if(removable.length<-delta)throw fault(409,'Keep original crew and busy agents; wait for jobs to finish');for(const w of removable.slice(0,-delta))saveWorker({...w,state:'OFFLINE',deactivated:true,task_description:'Reserve crew'});}
  else if(delta>0){
   const reserve=team.filter(w=>(w.managed||w.dynamic)&&w.deactivated);if(all.length+Math.max(0,delta-reserve.length)>MAX_AGENTS)throw fault(409,'Roster has 124 saved roles; reactivate reserve agents in their existing department');
   const layout=structuredClone(getLayout()),placements=[],usedSlots=new Set(team.map(w=>w.crewSlot).filter(Number.isInteger));
   for(let i=0;i<delta;i++){
    const old=reserve[i];let slot=old?.crewSlot;if(slot===undefined){slot=0;while(usedSlots.has(slot))slot++;usedSlots.add(slot);}const dockIndex=Math.floor(slot/12);
    let dock=layout.bays.find(b=>b.crewDepartment===department&&b.crewIndex===dockIndex);
    if(!dock){const side=['south','west','north','east'].find(side=>layout.bays.filter(b=>b.side===side).length<8);if(!side)throw fault(409,'No free bay for additional crew; remove an empty outer bay first');dock={...nextBay(layout,side,'workshop'),crewDepartment:department,crewIndex:dockIndex};layout.bays.push(dock);layout.revision++;}
    const room=bayRooms(layout).find(r=>r.id===dock.id),p={x:room.x+35+slot%6*48,y:room.y+105+Math.floor(slot%12/6)*60};placements.push({old,slot,dock,p});
   }
   saveLayout(layout);registerModuleRoutes(bayRooms(layout));
   for(const [i,{old,slot,dock,p}] of placements.entries()){const id=old?.id||'CR-'+String(all.length+i-reserve.length+1).padStart(3,'0');saveWorker({...make(id,department,DEPARTMENTS[department].name+' '+id,team.length+i),deactivated:false,crewSlot:slot,crewDock:dock.id,route:[p],x:p.x,y:p.y,current_room:dock.id,destination:dock.id});}
  }
  log('Crew deployed: '+department+' · '+target+' active agents');return overview();
 }
 function salesEvent(c,action){
  if(action.startsWith('Automatic')||action.startsWith('Production')||action.startsWith('Interrupted'))return;
  const w=workers().filter(w=>w.home==='sales'&&!w.deactivated&&!w.active_task).sort((a,b)=>(a.jobsCompleted||0)-(b.jobsCompleted||0))[0];if(!w)return;
  const next=visitStation(w,'sales',action==='handoff'?2:action==='proposal'?1:0,'IDLE',null);
  saveWorker({...(!isRunning()?freezeWorker(next):next),jobsCompleted:(w.jobsCompleted||0)+1,task_description:'Saved '+action+' · '+c.client,last_check:c.id});
 }
 async function prepare(c,signal){
  const w=workers().filter(w=>w.home==='thumbnails'&&!w.deactivated&&!w.active_task).sort((a,b)=>(a.jobsCompleted||0)-(b.jobsCompleted||0))[0];if(!w)throw Error('No thumbnail crew available');
  saveWorker({...visitStation(w,'sales',1,'WORKING','sales:'+c.id),task_description:'Collecting approved brief · '+c.client});
  const arrive=async()=>{if(!fast)while(positionAt(workers().find(a=>a.id===w.id)).moving){signal.throwIfAborted();await delay(100,null,{signal});}};
  await arrive();signal.throwIfAborted();
  saveWorker({...visitStation(workers().find(a=>a.id===w.id),'thumbnails',w.station_index,'WORKING','sales:'+c.id),task_description:'Moving brief to PNG workstation · '+c.client});
  await arrive();signal.throwIfAborted();
  saveWorker({...workers().find(a=>a.id===w.id),task_description:'Rendering two PNG compositions · '+c.client});
 }
 function finish(c,success){for(const w of workers().filter(w=>w.active_task==='sales:'+c.id))saveWorker({...w,state:isRunning()?'IDLE':'STOPPED',resume_state:'IDLE',active_task:null,progress:success?100:0,jobsCompleted:(w.jobsCompleted||0)+(success?1:0),task_description:success?'PNG pair completed; awaiting visual review':'Sales work paused or failed; see queue'});}
 return {overview,resize,salesEvent,prepare,finish};
}
