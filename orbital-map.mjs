// Presentation geometry only. Saved room IDs, routes and factory layout remain unchanged.
import {bayRooms} from './layout.mjs';
import {PLACEMENTS} from './orbital-assets.mjs';
import {routeDuration} from './workers.mjs';
import {roomBlueprint,roomStation,roomPath} from './orbital-rooms.mjs';
export const ORBITAL_CORE={x:0,y:0,w:1448,h:670};
export const NEO_ROOM={id:'neo',name:'NEO COMMAND',x:573,y:0,w:260,h:408};
export const HUB={x:707,y:410};
const definitions=[
 ['research','research_lab','RESEARCH LAB','Live market research and opportunity validation','#7de7bd'],
 ['product','planner','PRODUCT FACTORY','Planning, packaging and publishing researched products','#e1c377'],
 ['website','website_creator','WEBSITE CREATOR','Website production and deployment workflow','#7bd5da'],
 ['ops','sales_support','NEO OPS / LOGISTICS','Scheduling, queues and maintenance','#e1c377'],
 ['quality','analytics','QUALITY CONTROL','Content, packaging and release checks','#7de7bd'],
 ['automation','auto_scaler','AUTOMATION / DATA','Agent capacity, connectors and operational data','#7bd5da']
];
const placement=id=>{const p=PLACEMENTS.find(p=>p.sprite_id===id);return {x:p.world_xy[0],y:p.world_xy[1],w:p.original_crop_bbox[2]-p.original_crop_bbox[0],h:p.original_crop_bbox[3]-p.original_crop_bbox[1],sprite:id};};
export const CORE_ROOMS=definitions.map(([id,sprite,name,desc,accent])=>({id,name,desc,accent,...placement(sprite),metrics:['Live factory state']}));
const embedded={sales:'marketplace_ops',thumbnails:'content_creation'};
export function orbitalBay(b,layout){
 if(embedded[b.moduleId])return {...b,...placement(embedded[b.moduleId]),embedded:true};
 const preceding=layout.bays.filter(other=>other.side===b.side&&other.index<b.index&&!embedded[other.moduleId]);
 const span=other=>['fiverr','etsy'].includes(other.moduleId)?(['east','west'].includes(b.side)?720:380):(['east','west'].includes(b.side)?360:320);
 const offset=preceding.reduce((n,other)=>n+span(other),0),w=b.marketplace?680:320,h=b.marketplace?330:260;
 const positions={east:{x:1500+offset,y:300},west:{x:-60-offset-w,y:300},north:{x:710-w/2,y:-80-offset-h},south:{x:710-w/2,y:690+offset}};
 return {...b,...positions[b.side],w,h,sprite:b.type==='servers'?'auto_scaler':b.type==='storage'?'marketplace_ops':'content_creation'};
}
export const orbitalBays=layout=>bayRooms(layout).map(b=>orbitalBay(b,layout));
export const orbitalRooms=layout=>[...CORE_ROOMS,...orbitalBays(layout)];
export function orbitalBounds(layout){const rs=[ORBITAL_CORE,...orbitalBays(layout).filter(r=>!r.embedded)];const x=Math.min(...rs.map(r=>r.x))-22,y=Math.min(...rs.map(r=>r.y))-25;return {x,y,w:Math.max(...rs.map(r=>r.x+r.w))+22-x,h:Math.max(...rs.map(r=>r.y+r.h))+42-y};}
export const department=r=>r.moduleId||r.crewDepartment||r.id;
export function roomFor(key,layout){return orbitalRooms(layout).find(r=>r.id===key||r.moduleId===key)||NEO_ROOM;}
export function stationFor(room,index=0){if(room.id==='neo')return {x:620+(index%8)*24,y:410+Math.floor(index%24/8)*11};return roomStation(room,index);}
const legacy=[['website',92,72,390,225],['research',96,410,375,220],['product',803,68,380,210],['quality',824,315,355,142],['automation',795,488,389,150],['ops',96,315,300,74]].map(([id,x,y,w,h])=>({id,x,y,w,h}));
function frozenPosition(agent,layout){const p=agent.route?.[0]||agent,source=[...legacy,...bayRooms(layout)].find(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);return stationFor(roomFor(source?.moduleId||source?.id||agent.current_room||'neo',layout),agent.workstation??agent.station_index??0);}
const entry=room=>roomBlueprint(room).entry;
// Expansion artwork and worker navigation share these corridor centre lines.
export function expansionConnection(room,layout){
 const previous=orbitalBays(layout).filter(r=>!r.embedded&&r.side===room.side&&r.index<room.index).sort((a,b)=>b.index-a.index)[0];
 const horizontal=['east','west'].includes(room.side),negative=['west','north'].includes(room.side);
 if(horizontal){const y=entry(room).y;return {horizontal,from:{x:previous?(negative?previous.x:previous.x+previous.w):(negative?10:1440),y},to:{x:negative?room.x+room.w:room.x,y}};}
 const x=entry(room).x;return {horizontal,from:{x,y:previous?(negative?previous.y+45:previous.y+previous.h):(negative?15:610)},to:{x,y:negative?room.y+room.h:room.y+45}};
}
export function corridorTo(room){
 if(room.id==='neo')return [HUB];const target=entry(room);
 if(room.expansion&&!room.embedded){
  const paths={east:[HUB,{x:707,y:590},{x:1090,y:590},{x:1090,y:562},{x:1440,y:562},{x:1440,y:target.y}],west:[HUB,{x:707,y:580},{x:318,y:580},{x:318,y:543},{x:10,y:543},{x:10,y:target.y}],north:[HUB,{x:595,y:410},{x:595,y:-20},{x:target.x,y:-20}],south:[HUB,{x:707,y:640},{x:target.x,y:640}]};
  return [...paths[room.side],target];
 }
 if(room.y<320){const side=room.x<573?595:820;return [HUB,{x:side,y:410},{x:side,y:target.y},target];}
 if(room.x<320)return [HUB,{x:707,y:580},{x:318,y:580},{x:318,y:target.y},target];
 if(room.x>1090)return [HUB,{x:707,y:590},{x:1090,y:590},{x:1090,y:target.y},target];
 return [HUB,{x:707,y:target.y},target];
}
export function visualPath(agent,layout,start){
 const source=roomFor(agent.current_room||agent.home||'neo',layout),destination=roomFor(agent.destination||'neo',layout),end=stationFor(destination,agent.workstation??agent.station_index??0),origin=start||stationFor(source,agent.station_index||0);
 if(source.id===destination.id)return roomPath(source,origin,end);
 const exit=corridorTo(source),entrance=corridorTo(destination);
 return [...roomPath(source,origin,exit.at(-1)),...exit.slice().reverse().slice(1),...entrance.slice(1),...roomPath(destination,entrance.at(-1),end).slice(1)];
}
export function alongPath(path,fraction){let length=0;for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);let distance=length*Math.max(0,Math.min(1,fraction));for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(d&&distance<d){const t=distance/d;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,facing:Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x<a.x?'left':'right'):(b.y<a.y?'up':'down'),remaining:path.slice(i)};}distance-=d;}return {...path.at(-1),facing:'down',remaining:[]};}
export function visualMotion(agent,layout,now,{start,path:continuedPath}={}){
 const source=roomFor(agent.current_room||agent.home||'neo',layout),destination=roomFor(agent.destination||'neo',layout),index=agent.workstation??agent.station_index??0;
 const end=stationFor(destination,index),route=agent.route||[],duration=route.length>1&&agent.speed>0?routeDuration({...agent,route}):0;
 const fraction=duration?Math.max(0,Math.min(1,(now-agent.started_at)/duration)):1;
 const moving=agent.state!=='STOPPED'&&fraction<1;
 if(agent.state==='STOPPED')return {...(start||frozenPosition(agent,layout)),moving:false,facing:agent.facing||'down',fraction:0};
 if(!moving&&agent.state!=='STOPPED')return {...end,moving:false,facing:'down',fraction};
 const path=continuedPath||visualPath(agent,layout,start);
 return {...alongPath(path,agent.state==='STOPPED'?0:fraction),moving,fraction};
}
// Public snapshots intentionally trim routes and reset started_at every poll. Track the
// unchanged arrival/target so these updates never send a walking agent back to its room.
export function createMotionTracker(){
 const poses=new Map();
 return {sample(agent,layout,now,powered){
  const raw=agent.motion||agent,previous=poses.get(agent.id);
  if(!powered&&previous){previous.frozen=true;return {...previous.p,moving:false};}
  const arrival=raw.started_at+(raw.route?.length>1&&raw.speed>0?routeDuration(raw):0),last=raw.route?.at(-1)||raw,target=raw.destination+':'+last.x+':'+last.y;
  const continued=previous&&previous.target===target&&Math.abs(previous.arrival-arrival)<100;
  const tracked=continued?previous.tracked:raw,start=continued?previous.start:previous?.p;
  const path=continued?previous.path:previous?.frozen&&previous.target===target&&previous.p.remaining?.length?[previous.p,...previous.p.remaining]:visualPath(raw,layout,start);
  const p=visualMotion({...tracked,state:raw.state},layout,now,{start,path});poses.set(agent.id,{arrival,target,tracked,start,path,p});return p;
 },prune(agents){const ids=new Set(agents.map(a=>a.id));for(const id of poses.keys())if(!ids.has(id))poses.delete(id);}};
}

export function roomActivity(rooms,drawn,{powered,online}){
 const result=new Map(rooms.map(r=>[r.id,{crew:0,working:0,inspecting:0,inbound:0,idle:0,error:0,status:online?(powered?'IDLE':'PAUSED'):'OFFLINE'}]));
 for(const {a,p}of drawn){
  if(a.deactivated||a.state==='CONNECTING')continue;
  // A crew dock belongs to a department, but is a separate physical workplace.
  const room=rooms.find(r=>a.destination===r.id||(r.moduleId&&a.destination===r.moduleId));if(!room)continue;
  const activity=result.get(room.id);activity.crew++;
  if(!powered)continue;
  if(p.moving)activity.inbound++;else if(a.state==='WORKING')activity.working++;else if(a.state==='INSPECTING')activity.inspecting++;else if(['ERROR','OFFLINE'].includes(a.state))activity.error++;else activity.idle++;
 }
 if(powered)for(const activity of result.values())activity.status=activity.error?'ATTENTION':activity.working||activity.inspecting?'ACTIVE':activity.inbound?'INBOUND':'READY';
 return result;
}
