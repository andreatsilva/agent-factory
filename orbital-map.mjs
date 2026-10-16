// Presentation geometry only. Saved room IDs, routes and factory layout remain unchanged.
import {bayRooms} from './layout.mjs';
import {PLACEMENTS} from './orbital-assets.mjs';
import {routeDuration} from './workers.mjs';
export const ORBITAL_CORE={x:0,y:0,w:1448,h:640};
export const NEO_ROOM={id:'neo',name:'NEO COMMAND',x:573,y:0,w:260,h:408};
export const HUB={x:707,y:353};
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
 const index=layout.bays.filter(other=>other.side===b.side&&other.index<b.index&&!embedded[other.moduleId]).length;
 const positions={east:{x:1500+index*360,y:300},west:{x:-380-index*360,y:300},north:{x:550,y:-340-index*320},south:{x:550,y:690+index*320}};
 return {...b,...positions[b.side],w:320,h:260,sprite:b.type==='servers'?'auto_scaler':b.type==='storage'?'marketplace_ops':'content_creation'};
}
export const orbitalBays=layout=>bayRooms(layout).map(b=>orbitalBay(b,layout));
export const orbitalRooms=layout=>[...CORE_ROOMS,...orbitalBays(layout)];
export function orbitalBounds(layout){const rs=[ORBITAL_CORE,...orbitalBays(layout).filter(r=>!r.embedded)];const x=Math.min(...rs.map(r=>r.x))-22,y=Math.min(...rs.map(r=>r.y))-25;return {x,y,w:Math.max(...rs.map(r=>r.x+r.w))+22-x,h:Math.max(...rs.map(r=>r.y+r.h))+25-y};}
export const department=r=>r.moduleId||r.crewDepartment||r.id;
export function roomFor(key,layout){return orbitalRooms(layout).find(r=>r.id===key||r.moduleId===key)||NEO_ROOM;}
export function stationFor(room,index=0){if(room.id==='neo')return {x:620+(index%8)*24,y:363+Math.floor(index%24/8)*11};const columns=6;return {x:room.x+45+(index%columns)*(room.w-90)/(columns-1),y:room.y+room.h*.72+Math.floor(index%12/columns)*18};}
const legacy=[['website',92,72,390,225],['research',96,410,375,220],['product',803,68,380,210],['quality',824,315,355,142],['automation',795,488,389,150],['ops',96,315,300,74]].map(([id,x,y,w,h])=>({id,x,y,w,h}));
function frozenPosition(agent,layout){const p=agent.route?.[0]||agent,source=[...legacy,...bayRooms(layout)].find(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);if(!source)return stationFor(roomFor(agent.current_room||'neo',layout),agent.station_index||0);const r=roomFor(source.moduleId||source.id,layout);return {x:r.x+30+(p.x-source.x)/source.w*(r.w-60),y:r.y+r.h*.68+(p.y-source.y)/source.h*r.h*.12};}
const entry=room=>({x:room.x+room.w/2,y:room.y+room.h*.76});
export function corridorTo(room){
 if(room.id==='neo')return [HUB];const target=entry(room);
 if(room.expansion&&!room.embedded){const edge={east:{x:1440,y:500},west:{x:10,y:500},north:{x:707,y:20},south:{x:707,y:610}}[room.side];return [HUB,{x:707,y:edge.y},edge,...(['east','west'].includes(room.side)?[{x:target.x,y:edge.y}]:[{x:edge.x,y:target.y}]),target];}
 if(room.y<320)return [HUB,{x:room.x<573?595:820,y:253},{x:target.x,y:235},target];
 return [HUB,{x:707,y:526},{x:target.x,y:526},target];
}
export function alongPath(path,fraction){let length=0;for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);let distance=length*Math.max(0,Math.min(1,fraction));for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(d&&distance<=d){const t=distance/d;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,facing:b.x<a.x?'left':'right'};}distance-=d;}return {...path.at(-1),facing:'down'};}
export function visualMotion(agent,layout,now,{start}={}){
 const source=roomFor(agent.current_room||agent.home||'neo',layout),destination=roomFor(agent.destination||'neo',layout),index=agent.workstation??agent.station_index??0;
 const end=stationFor(destination,index),route=agent.route||[],duration=route.length>1&&agent.speed>0?routeDuration({...agent,route}):0;
 const fraction=duration?Math.max(0,Math.min(1,(now-agent.started_at)/duration)):1;
 const moving=agent.state!=='STOPPED'&&fraction<1;
 if(agent.state==='STOPPED')return {...(start||frozenPosition(agent,layout)),moving:false,facing:agent.facing||'down',fraction:0};
 if(!moving&&agent.state!=='STOPPED')return {...end,moving:false,facing:'down',fraction};
 const origin=start||stationFor(source,agent.station_index||0);
 const path=source.id===destination.id?[origin,{x:source.x+source.w*.5,y:origin.y},end]:[origin,...corridorTo(source).slice().reverse(),...corridorTo(destination).slice(1),end];
 return {...alongPath(path,agent.state==='STOPPED'?0:fraction),moving,fraction};
}
// Public snapshots intentionally trim routes and reset started_at every poll. Track the
// unchanged arrival/target so these updates never send a walking agent back to its room.
export function createMotionTracker(){
 const poses=new Map();
 return {sample(agent,layout,now,powered){
  const raw=agent.motion||agent,previous=poses.get(agent.id);
  if(!powered&&previous)return {...previous.p,moving:false};
  const arrival=raw.started_at+(raw.route?.length>1&&raw.speed>0?routeDuration(raw):0),last=raw.route?.at(-1)||raw,target=raw.destination+':'+last.x+':'+last.y;
  const continued=previous&&previous.target===target&&Math.abs(previous.arrival-arrival)<100;
  const tracked=continued?previous.tracked:raw,start=continued?previous.start:previous?.p;
  const p=visualMotion({...tracked,state:raw.state},layout,now,{start});poses.set(agent.id,{arrival,target,tracked,start,p});return p;
 },prune(agents){const ids=new Set(agents.map(a=>a.id));for(const id of poses.keys())if(!ids.has(id))poses.delete(id);}};
}
