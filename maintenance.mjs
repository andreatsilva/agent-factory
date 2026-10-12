import {positionAt,visitStation,WORKSTATIONS} from './workers.mjs';

// These are actual inexpensive local checks. They never generate, sell or infer.
export const INSPECTIONS=[
 {worker:'WC-02',name:'Manufacturing brief inspection',stops:['website','ops'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(json_valid(brief)=0) invalid FROM product_specs').get();return {ok:!r.invalid,detail:`${r.total} manufacturing briefs; ${r.invalid||0} malformed records`};}},
 {worker:'WC-03',name:'Guide record inspection',stops:['website','quality'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(guide IS NOT NULL AND json_valid(guide)=0) invalid FROM product_specs').get();return {ok:!r.invalid,detail:`${r.total} product specifications; ${r.invalid||0} malformed guides`};}},
 {worker:'WC-04',name:'Built artifact inventory',stops:['website','product'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(artifact IS NULL OR length(artifact)<100) invalid FROM products WHERE status='published'").get();return {ok:!r.invalid,detail:`${r.total} published artifacts; ${r.invalid||0} missing or empty`};}},
 {worker:'RL-01',name:'Source run log inspection',stops:['research','ops'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(state='failed') failed FROM source_runs").get();return {ok:true,detail:`${r.total} recorded source runs; ${r.failed||0} historical failures`};}},
 {worker:'RL-02',name:'Saved evidence inspection',stops:['research','automation'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(json_valid(data)=0) invalid FROM research_evidence').get();return {ok:!r.invalid,detail:`${r.total} evidence records; ${r.invalid||0} malformed records`};}},
 {worker:'RL-03',name:'Decision ledger inspection',stops:['research','ops'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(decision='approved') approved FROM candidate_decisions").get();return {ok:true,detail:`${r.total} saved decisions; ${r.approved||0} approved`};}},
 {worker:'RL-04',name:'Manufacturing price inspection',stops:['research','product'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(json_extract(brief,'$.price_cents')!=2000) invalid FROM product_specs").get();return {ok:!r.invalid,detail:`${r.total} briefs; ${r.invalid||0} fixed-price mismatches`};}},
 {worker:'RL-05',name:'Saved score inspection',stops:['research','quality'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(neo_score<0 OR neo_score>100) invalid FROM opportunities').get();return {ok:!r.invalid,detail:`${r.total} saved opportunities; ${r.invalid||0} out-of-range scores`};}},
 {worker:'WC-01',name:'Queue inspection',stops:['ops','website'],check:db=>{const rows=db.prepare("SELECT state,count(*) count FROM jobs GROUP BY state").all();return {ok:true,detail:JSON.stringify(rows)};}},
 {worker:'RL-06',name:'Evidence / cache inspection',stops:['research','automation'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(expires_at < ?) expired FROM source_cache').get(Date.now());return {ok:true,detail:`${r.total} cached sources; ${r.expired||0} due for refresh`};}},
 {worker:'PF-01',name:'Package inventory check',stops:['product','automation'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(package IS NULL OR length(package)=0) missing FROM products WHERE status='published'").get();return {ok:!r.missing,detail:`${r.total} published packages; ${r.missing||0} missing archives`};}},
 {worker:'WC-05',name:'Release gate inspection',stops:['quality','product'],check:db=>{const r=db.prepare("SELECT count(*) total,sum(qa_status!='passed') invalid FROM products WHERE status='published'").get();return {ok:!r.invalid,detail:`${r.total} published products; ${r.invalid||0} without passed QA`};}},
 {worker:'WC-06',name:'Catalog / price inspection',stops:['product','website'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(price_cents!=2000) invalid FROM products').get();return {ok:!r.invalid,detail:`${r.total} catalog records; ${r.invalid||0} price mismatches`};}},
 {worker:'WC-07',name:'Delivery record inspection',stops:['website','ops'],check:db=>{const r=db.prepare('SELECT count(*) total,sum(paid=1 AND token IS NULL) invalid FROM orders').get();return {ok:!r.invalid,detail:`${r.total} orders; ${r.invalid||0} paid orders missing delivery tokens`};}}
];
export function createMaintenance({db,workers,saveWorker,isRunning,activeJob,clock=Date.now}){
 db.exec('CREATE TABLE IF NOT EXISTS maintenance_checks(worker_id TEXT PRIMARY KEY,name TEXT NOT NULL,ok INTEGER NOT NULL,detail TEXT NOT NULL,checked_at INTEGER NOT NULL)');
 function tick(){
  if(!isRunning())return;
  const time=clock(),all=workers().sort((a,b)=>(a.last_inspection_at||0)-(b.last_inspection_at||0)||a.station_index-b.station_index);let inspecting=all.filter(w=>w.inspection).length;
  for(let w of all){
   if(w.state==='STOPPED')continue;
   const p=positionAt(w,time);
   // A long-running real task visits its line's service points between work gestures.
   if(w.state==='WORKING'&&[].concat(activeJob()).includes(w.active_task)&&WORKSTATIONS[w.destination]){
    if(p.moving)continue;
    if(!w.station_due){saveWorker({...w,station_due:time+7000+(w.station_index%3)*1300});continue;}
    if(time>=w.station_due){const next=visitStation(w,w.destination,(w.workstation||0)+1,'WORKING',w.active_task,time);saveWorker({...next,progress:w.progress,task_description:w.task_description});}continue;
   }
   const def=INSPECTIONS.find(d=>d.worker===w.id);if(!def)continue;
   if(w.inspection){
    if(p.moving)continue;
    if(!w.station_due){saveWorker({...w,station_due:time+6500});continue;}
    if(time<w.station_due)continue;
    let result;try{result=def.check(db);}catch(e){result={ok:false,detail:e.message};}
    db.prepare('INSERT INTO maintenance_checks VALUES(?,?,?,?,?) ON CONFLICT(worker_id) DO UPDATE SET name=excluded.name,ok=excluded.ok,detail=excluded.detail,checked_at=excluded.checked_at').run(w.id,def.name,Number(result.ok),result.detail,time);
    const step=w.inspection.step+1;
    if(step<def.stops.length){w=visitStation(w,def.stops[step],w.station_index+step,'INSPECTING','inspection:'+w.id,time);saveWorker({...w,inspection:{step},progress:50,task_description:def.name,last_check:result.detail});}
    else{saveWorker({...w,state:'IDLE',active_task:null,inspection:null,station_due:null,progress:100,task_description:'Inspection complete · standby',last_check:result.detail,last_inspection_at:time,health:result.ok?'ok':'warning'});inspecting--;}
   }else if(w.state==='IDLE'&&!w.active_task&&!p.moving&&inspecting<4&&time-(w.last_inspection_at||0)>45000){
    w=visitStation(w,def.stops[0],w.station_index,'INSPECTING','inspection:'+w.id,time);saveWorker({...w,inspection:{step:0},task_description:def.name});inspecting++;
   }
  }
 }
 return {tick};
}
