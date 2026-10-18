import {FACTORY_MODULES,DEPARTMENTS,MAX_AGENTS} from './factory-modules.mjs';
import {WORKSTATIONS,visitStation,positionAt,freezeWorker,registerModuleRoutes} from './workers.mjs';
import {bayRooms,nextBay,emptyLayout} from './layout.mjs';
import {setTimeout as delay} from 'node:timers/promises';
const fault=(status,message)=>Object.assign(Error(message),{status});
export function createFactoryCrew({workers,saveWorker,isRunning,log,fast=false,getLayout=emptyLayout,saveLayout=()=>{},getPolicy=()=>({automatic:false}),savePolicy=()=>{},getDemand=()=>({}),transaction=fn=>fn(),clock=Date.now}){
 const flexible=w=>(w.managed||w.dynamic)&&!w.coreModule;
 const busy=w=>!!w.active_task||!!w.inspection||w.state==='WORKING'||w.state==='INSPECTING';
 let lastBalance=0,lastReport={moved:0,reserved:0,activated:0};
 function make(id,home,name,index){const p=WORKSTATIONS[home][index%WORKSTATIONS[home].length];const w={id,name,role:name.toUpperCase(),home,current_room:home,destination:home,state:'IDLE',route:[p],x:p.x,y:p.y,started_at:Date.now(),speed:100,station_index:index,active_task:null,progress:0,health:'ok',capabilities:[DEPARTMENTS[home].capability],jobsCompleted:0,managed:true,task_description:'Available for '+DEPARTMENTS[home].name};return isRunning()?w:freezeWorker(w);}
 for(const m of FACTORY_MODULES)for(const [i,[id,name]] of m.crew.entries())if(!workers().some(w=>w.id===id))saveWorker({...make(id,m.id,name,i),coreModule:true});
 // Reconcile unfinished visual assignments against recovered SQLite queue state.
 for(const w of workers().filter(w=>w.active_task?.startsWith('sales:')))saveWorker({...w,active_task:null,state:isRunning()?'IDLE':'STOPPED',resume_state:'IDLE',task_description:'Recovered sales task; queued for resume'});
 function plan(){
  const all=workers(),demand=getDemand(),lanes=Math.max(1,Math.min(4,demand.lanes||1)),work=Math.min(lanes,Math.max(0,demand.queued||0)+(demand.producing||0));
  const needs={website:work,quality:work,product:work,research:demand.research?1:0,sales:0,thumbnails:(demand.thumbnailQueued||0)+(demand.thumbnailProducing||0)>0?1:0};
  for(const w of all.filter(w=>!w.deactivated&&busy(w)))needs[w.home]=Math.max(needs[w.home]||0,all.filter(a=>a.home===w.home&&!a.deactivated&&busy(a)).length);
  const targets=Object.fromEntries(Object.keys(DEPARTMENTS).map(id=>[id,all.filter(w=>w.home===id&&!w.deactivated&&(!flexible(w)||busy(w))).length]));
  let budget=Math.max(0,Math.min(MAX_AGENTS,demand.maxAgents??MAX_AGENTS)-Object.values(targets).reduce((a,b)=>a+b,0));
  for(const id of ['quality','product','website','thumbnails','research','sales']){const extra=Math.min(budget,Math.max(0,Math.min(demand.limits?.[id]??MAX_AGENTS,needs[id]||0)-targets[id]));targets[id]+=extra;budget-=extra;}
  return {targets,demand,reason:work?'Allocating crew for '+work+' production lanes':demand.state==='BUDGET_LIMIT'?'Budget limit · surplus crew in reserve':demand.state==='WAITING_FOR_PRODUCT_PLANNER'?'Waiting for new product briefs · surplus crew in reserve':'No queued production · surplus crew in reserve'};
 }
 function overview(){const all=workers(),live=all.filter(w=>!w.deactivated),{targets,reason,demand}=plan();return {running:isRunning(),limit:MAX_AGENTS,total:all.length,active:live.length,reserve:all.length-live.length,busy:live.filter(w=>w.active_task&&!w.inspection).length,maintenance:live.filter(w=>w.inspection).length,automatic:getPolicy().automatic===true,allocation:{targets,reason:isRunning()?reason:'Factory paused · allocation resumes with START FACTORY',lanes:demand.lanes||1,...lastReport},departments:Object.entries(DEPARTMENTS).map(([id,d])=>({id,name:d.name,total:all.filter(w=>w.home===id).length,active:live.filter(w=>w.home===id).length,busy:live.filter(w=>w.home===id&&w.active_task&&!w.inspection).length,reserve:all.filter(w=>w.home===id&&w.deactivated).length,target:targets[id]}))};}
 function rebalance({force=false}={}){
  if(!getPolicy().automatic||!isRunning())return overview();const time=clock();if(!force&&time-lastBalance<15000)return;lastBalance=time;
  const {targets}=plan(),report={moved:0,reserved:0,activated:0},original=workers(),updates=new Map(),current=()=>original.map(w=>updates.get(w.id)||w),set=w=>updates.set(w.id,w);
  const layout=structuredClone(getLayout());let layoutChanged=false;
  // Active jobs are never interrupted. Excess roles retain identity and history in reserve.
  for(const home of Object.keys(DEPARTMENTS)){
   let surplus=current().filter(w=>w.home===home&&!w.deactivated).length-targets[home];
   for(const w of current().filter(w=>w.home===home&&!w.deactivated&&flexible(w)&&!busy(w)).sort((a,b)=>(a.idleSince||a.started_at||0)-(b.idleSince||b.started_at||0))){
    if(surplus<=0)break;if(!force&&time-(w.idleSince||w.started_at||time)<90000)continue;
    set({...w,state:'OFFLINE',resume_state:'IDLE',deactivated:true,active_task:null,queue:[],route:[positionAt(w,time)],started_at:time,task_description:'Automatic reserve · waiting for matching queue work',reservedAt:time});surplus--;report.reserved++;
   }
  }
  for(const home of Object.keys(DEPARTMENTS)){
   let missing=targets[home]-current().filter(w=>w.home===home&&!w.deactivated).length;
   const pool=current().filter(w=>flexible(w)&&w.deactivated&&!busy(w)).sort((a,b)=>Number(b.home===home)-Number(a.home===home)||(a.jobsCompleted||0)-(b.jobsCompleted||0)||a.id.localeCompare(b.id));
   for(const old of pool){if(missing<=0)break;
    const used=new Set(current().filter(w=>w.home===home&&w.id!==old.id).map(w=>w.crewSlot).filter(Number.isInteger));let slot=old.home===home&&Number.isInteger(old.crewSlot)&&!used.has(old.crewSlot)?old.crewSlot:0;while(used.has(slot))slot++;
    let dock=layout.bays.find(b=>b.crewDepartment===home&&b.crewIndex===Math.floor(slot/12));
    if(!dock){const side=['south','west','north','east'].find(s=>layout.bays.filter(b=>b.side===s).length<8);if(!side)continue;dock={...nextBay(layout,side,'workshop'),crewDepartment:home,crewIndex:Math.floor(slot/12)};layout.bays.push(dock);layout.revision++;layoutChanged=true;}
    const next=visitStation({...old,home,capabilities:[DEPARTMENTS[home].capability],state:'IDLE',resume_state:'IDLE',deactivated:false,active_task:null,inspection:null,crewSlot:slot,crewDock:dock.id,station_index:slot,idleSince:time},home,slot,'IDLE',null,time);
    set({...next,name:DEPARTMENTS[home].name+' '+old.id,role:DEPARTMENTS[home].name.toUpperCase(),task_description:'Allocated to '+DEPARTMENTS[home].name+' queue'});missing--;report.activated++;if(old.home!==home)report.moved++;
   }
  }
  // Return idle crew to their own station instead of accumulating in the last visited line.
  for(const w of current().filter(w=>!w.deactivated&&!busy(w)&&w.state==='IDLE'&&!positionAt(w,time).moving)){
   const destination=w.crewDock||w.home;if(w.destination!==destination&&time-(w.idleSince||w.started_at||time)>15000)set({...visitStation(w,destination,w.crewSlot??w.station_index,'IDLE',null,time),task_description:'Available at '+(w.crewDock?'crew dock':DEPARTMENTS[w.home].name)});
  }
  transaction(()=>{if(layoutChanged)saveLayout(layout);for(const w of updates.values())saveWorker(w);});if(layoutChanged)registerModuleRoutes(bayRooms(layout));lastReport={...report,at:time};
  if(report.reserved||report.activated)log('NEO // CREW: '+report.moved+' reassigned · '+report.activated+' activated · '+report.reserved+' moved to reserve');return overview();
 }
 function configure({automatic}){if(typeof automatic!=='boolean')throw fault(400,'Automatic allocation must be true or false');savePolicy({automatic});if(automatic)rebalance({force:true});log('Automatic crew allocation '+(automatic?'enabled':'disabled'));return overview();}
 function resize({department,target}){
  if(getPolicy().automatic)throw fault(409,'Switch automatic allocation off before manually deploying crew');
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
 return {overview,resize,salesEvent,prepare,finish,configure,rebalance,tick:()=>rebalance()};
}
