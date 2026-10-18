// Shared, deterministic motion model; no browser or server dependencies.
export const HUB={x:640,y:348};
export const ROUTES={website:[HUB,{x:530,y:348},{x:500,y:310},{x:450,y:276}],research:[HUB,{x:535,y:412},{x:470,y:490}],product:[HUB,{x:730,y:285},{x:803,y:205}],quality:[HUB,{x:755,y:350},{x:824,y:380}],automation:[HUB,{x:725,y:440},{x:795,y:540}],ops:[HUB,{x:530,y:348},{x:396,y:352}],neo:[HUB]};
const definitions=[['WC-01','Scout','website'],['WC-02','Proposal','website'],['WC-03','Design','website'],['WC-04','Builder','website'],['WC-05','QA','quality'],['WC-06','Publisher','product'],['WC-07','Client','website'],['RL-01','Web scout','research'],['RL-02','Demand','research'],['RL-03','Competition','research'],['RL-04','Economics','research'],['RL-05','Score','research'],['RL-06','Evidence','research'],['PF-01','Packager','product']];
const stations={website:[{x:150,y:150},{x:230,y:150},{x:315,y:150},{x:405,y:150}],research:[{x:150,y:485},{x:240,y:485},{x:335,y:485},{x:425,y:485},{x:205,y:590},{x:350,y:590}],product:[{x:860,y:150},{x:945,y:150},{x:1030,y:150}],quality:[{x:880,y:398}],ops:[{x:200,y:375}],automation:[{x:925,y:580}]};
// Walkable service aisles beside the production belts, not through machine footprints.
export const WORKSTATIONS={website:[{x:155,y:155},{x:315,y:155},{x:400,y:220}],research:[{x:155,y:492},{x:280,y:492},{x:340,y:598}],product:[{x:850,y:200},{x:975,y:200},{x:1110,y:200}],quality:[{x:875,y:426},{x:1015,y:426},{x:1130,y:426}],automation:[{x:915,y:575},{x:1015,y:575},{x:1125,y:575}],ops:[{x:145,y:377},{x:275,y:377}]};
const AISLES={website:{x:455,y:208},research:{x:448,y:550},product:{x:815,y:200},quality:{x:834,y:426},automation:{x:805,y:575},ops:{x:388,y:377}};
export function registerModuleRoutes(rooms){
 for(const r of rooms.filter(r=>r.moduleId||r.crewDepartment)){
  const key=r.moduleId||r.id;
  const center={x:r.x+r.w/2,y:r.y+r.h/2},vertical=['north','south'].includes(r.side);
  const edge={east:{x:1245,y:350},west:{x:35,y:350},north:{x:640,y:40},south:{x:640,y:680}}[r.side];
  ROUTES[key]=[HUB,edge,center];AISLES[key]=center;
  WORKSTATIONS[key]=Array.from({length:r.marketplace?24:12},(_,i)=>({x:r.x+35+(i%6)*48,y:r.y+(r.marketplace?110+Math.floor(i/6)*24:135+Math.floor(i/6)*40)}));
  stations[key]=WORKSTATIONS[key];
 }
}
export function routeDuration(agent){let length=0;for(let i=1;i<agent.route.length;i++)length+=Math.hypot(agent.route[i].x-agent.route[i-1].x,agent.route[i].y-agent.route[i-1].y);return length/agent.speed*1000;}
export function visitStation(agent,room,station,state,task,time=Date.now()){
 const p=positionAt(agent,time),target=WORKSTATIONS[room][station%WORKSTATIONS[room].length],current=agent.destination||'neo';
 let route;
 if(current===room&&!p.moving){const aisle=AISLES[room];route=[{x:p.x,y:p.y},{x:aisle.x,y:p.y},{x:aisle.x,y:target.y},target];}
 else{const entry=AISLES[room],exit=AISLES[current],last=p.remaining.at(-1)||p;
  route=[{x:p.x,y:p.y},...p.remaining,...(exit?[{x:exit.x,y:last.y},exit]:[]),...(ROUTES[current]||[HUB]).slice().reverse(),...(ROUTES[room]||[HUB]).slice(1),entry,{x:entry.x,y:target.y},target];
 }
 return {...agent,state,active_task:task,destination:room,current_room:current,route,started_at:time,x:p.x,y:p.y,workstation:station,progress:0,station_due:null};
}
export function initialWorkers(time=Date.now()) {return definitions.map(([id,name,home],i)=>{const angle=i*Math.PI*2/14;const p={x:Math.round(640+Math.cos(angle)*110),y:Math.round(348+Math.sin(angle)*57)};return {id,name,role:name.toUpperCase(),home,current_room:'neo',destination:'neo',state:'IDLE',active_task:null,progress:0,speed:70+(i%3)*5,health:'ok',route:[p],started_at:time,x:p.x,y:p.y,station_index:i,resume_state:'IDLE'};});}
export function positionAt(agent,time=Date.now()) {
 const route=agent.route||[{x:agent.x,y:agent.y}];let distance=agent.state==='STOPPED'?0:Math.max(0,time-agent.started_at)/1000*agent.speed;
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(distance<len){const t=len?distance/len:1;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,moving:agent.state!=='STOPPED',facing:Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x>a.x?'right':'left'):(b.y>a.y?'down':'up'),remaining:[b,...route.slice(i+1)]};}distance-=len;}
 const p=route.at(-1)||HUB;return {...p,moving:false,facing:'down',remaining:[]};
}
export function viewWorker(agent,time=Date.now()){const p=positionAt(agent,time);return {...agent,x:p.x,y:p.y,moving:p.moving,facing:p.facing,current_room:p.moving?agent.current_room:agent.destination,display_state:agent.state==='STOPPED'?'STOPPED':p.moving?'WALKING':agent.state};}
export function assignWorker(agent,destination,state,task,progress=0,time=Date.now()){
 const p=positionAt(agent,time);
 if(agent.destination===destination&&agent.state!=='STOPPED')return {...agent,state,active_task:task,progress};
 const target=destination==='neo'?(initialWorkers(time).find(a=>a.id===agent.id)?.route[0]||HUB):(stations[destination]||[HUB])[agent.station_index%(stations[destination]||[HUB]).length];
 const current=(p.moving?agent.current_room:agent.destination)||'neo';
 const route=[{x:p.x,y:p.y},...(ROUTES[current]||[HUB]).slice().reverse(),...(ROUTES[destination]||[HUB]).slice(1),target];
 return {...agent,state,active_task:task,progress,destination,route,started_at:time,x:p.x,y:p.y};
}
export function freezeWorker(agent,time=Date.now()){if(agent.state==='STOPPED')return agent;const p=positionAt(agent,time);return {...agent,state:'STOPPED',resume_state:agent.state,route:[{x:p.x,y:p.y},...p.remaining],x:p.x,y:p.y,started_at:time,paused_at:time};}
export function resumeWorker(agent,time=Date.now()){return {...agent,state:agent.resume_state||'IDLE',started_at:time,station_due:agent.station_due?agent.station_due+Math.max(0,time-(agent.paused_at||time)):null,paused_at:null};}
export function assignmentFor(agent,stage){
 if(stage==='research'&&agent.id.startsWith('RL-'))return 'research';
 if(stage==='validation'&&agent.id.startsWith('RL-'))return 'research';
 if(stage==='brief'&&['WC-02','WC-03','RL-05'].includes(agent.id))return agent.id==='RL-05'?'neo':'website';
 if(stage==='building'&&agent.id==='WC-04')return 'website';
 if(stage==='building'&&agent.id==='PF-01')return 'product';
 if(stage==='quality'&&['WC-05','PF-01'].includes(agent.id))return 'quality';
 if(stage==='publishing'&&['WC-06','PF-01'].includes(agent.id))return 'product';
 return null;
}
