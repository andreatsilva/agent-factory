// Room construction uses individual, unchanged PNG pieces from the supplied pack.
// Positions are on a 320 x 260 deck; y is the ground contact used for depth sorting.
const cache=new Map();
const presets={
 research:{feature:'research_glass_dome',width:164,height:125,base:142,screen:'green_terminal_display_039'},
 product:{feature:'orbital_station_prop_082',width:216,height:76,base:140,screen:'green_terminal_display_040'},
 website:{feature:'green_terminal_display_054',width:172,height:148,base:141,screen:'green_terminal_display_053'},
 ops:{feature:'green_terminal_display_042',width:166,height:97,base:125,screen:'green_terminal_display_051'},
 quality:{feature:'green_terminal_display_044',width:168,height:96,base:125,screen:'green_terminal_display_039'},
 automation:{feature:'three_agent_pods',width:196,height:167,base:145,screen:'green_terminal_display_043'},
 sales:{feature:'green_terminal_display_053',width:192,height:81,base:120,screen:'green_terminal_display_040'},
 thumbnails:{feature:'green_terminal_display_041',width:181,height:108,base:126,screen:'green_terminal_display_052'},
 logos:{feature:'green_terminal_display_042',width:166,height:97,base:125,screen:'green_terminal_display_052'},
 apps:{feature:'green_terminal_display_054',width:172,height:148,base:141,screen:'green_terminal_display_043'}
};
export function roomBlueprint(room){
 const key=[room.id,room.x,room.y,room.w,room.h,room.type,room.moduleId,room.crewDepartment].join(':');if(cache.has(key))return cache.get(key);
 if(room.marketplace){
  const sx=room.w/680,sy=room.h/330;
  const sections=['research','product'].map((role,i)=>roomBlueprint({id:room.id+'-'+role,x:room.x+i*360*sx,y:room.y+45*sy,w:320*sx,h:260*sy,crewDepartment:role,marketSegment:true,accent:room.accent}));
  const slots=sections.flatMap(b=>b.slots.map(p=>({x:(b.room.x-room.x)/sx+p.x,y:45+p.y})));
  const objects=sections.flatMap((b,i)=>b.objects.map(o=>({...o,section:i}))),obstacles=sections.flatMap((b,i)=>b.obstacles.map(o=>({...o,x:o.x+i*360,y:o.y+45})));
  // Workers cross the open gap only on the bridge joining the two decks.
  obstacles.push({x:320,y:0,w:40,h:250},{x:320,y:280,w:40,h:50});
  const blueprint={room,sx,sy,sections,light:room.accent,objects,obstacles,slots,localWidth:680,localHeight:330,floor:{x:room.x,y:room.y+45*sy,w:room.w,h:260*sy},entry:{x:room.x+340*sx,y:room.y+265*sy}};
  cache.set(key,blueprint);return blueprint;
 }
 const sx=room.w/320,sy=room.h/260,objects=[],obstacles=[];
 const add=(id,x,y,w,h,{solid=true,depth=18,screen=false,kind='equipment'}={})=>{
  const footprint={x:x-w*.42,y:y-depth,w:w*.84,h:depth};
  objects.push({id,kind,screen,x:room.x+(x-w/2)*sx,y:room.y+(y-h)*sy,w:w*sx,h:h*sy,depth:room.y+y*sy,ground:{x:room.x+x*sx,y:room.y+y*sy},footprint});
  if(solid)obstacles.push(footprint);
 };
 const vertical=room.expansion&&!room.embedded&&['north','south'].includes(room.side),department=room.moduleId||room.crewDepartment||room.id,preset=presets[department]||presets.product;
 // Rear supports, side columns and individual workbenches provide real occluders.
 for(const x of [38,282])add('industrial_server_or_tower_070',x,76,34,26,{depth:14,kind:'supplies'});
 for(const x of [20,300])add('industrial_server_or_tower_046',x,room.marketSegment?190:225,24,88,{depth:16});
 if(room.type==='storage'&&!room.moduleId&&!room.crewDepartment){
  for(const x of [76,244])for(const y of [105,145,190])add('industrial_module_080',x,y,70,39,{depth:24,kind:'storage'});
 }else if(room.type==='servers'&&!room.moduleId&&!room.crewDepartment){
  for(const x of [65,110,210,255])add('industrial_server_or_tower_045',x,144,35,101,{depth:24,screen:true});
  for(const x of [80,240])add('workstation_console_062',x,202,110,53,{depth:27,screen:true,kind:'workbench'});
 }else{
  if(vertical){for(const x of [78,242])add(preset.screen,x,124,107,64,{depth:17,screen:true});}
  else add(preset.feature,160,preset.base,preset.width,preset.height,{depth:24,screen:true,kind:department==='product'?'fabricator':'feature'});
  for(const x of [80,240])add('workstation_console_062',x,202,110,53,{depth:27,screen:true,kind:'workbench'});
  if(!vertical)for(const x of [42,278])add('industrial_server_or_tower_049',x,137,24,67,{depth:14,screen:true});
 }
 const slots=Array.from({length:12},(_,i)=>({x:[52,82,112,208,238,268][i%6],y:i<6?165:214}));
 // Storage shelves use their front service aisle, never their solid footprints.
 if(room.type==='storage'&&!room.moduleId&&!room.crewDepartment)slots.forEach((p,i)=>{p.y=216+Math.floor(i/6)*16;});
 const light=({product:'#ffc86b',research:'#64efaa',website:'#66d9eb',quality:'#80e8cb',automation:'#85f29b',sales:'#e4c77a',thumbnails:'#85bdff',ops:'#93d9c7'})[department]||'#73cdd1';
 const blueprint={room,sx,sy,vertical,light,objects,obstacles,slots,floor:{id:'floor_platform_30',x:room.x,y:room.y+30*sy,w:room.w,h:230*sy},entry:{x:room.x+160*sx,y:room.y+220*sy}};
 cache.set(key,blueprint);if(cache.size>96)cache.delete(cache.keys().next().value);return blueprint;
}
export function roomStation(room,index=0){const b=roomBlueprint(room),p=b.slots[index%b.slots.length];return {x:room.x+p.x*b.sx,y:room.y+p.y*b.sy};}
const inflate=r=>({x:r.x-6,y:r.y-6,w:r.w+12,h:r.h+12});
const inside=(p,r)=>p.x>r.x+.01&&p.x<r.x+r.w-.01&&p.y>r.y+.01&&p.y<r.y+r.h-.01;
function crosses(a,b,r){
 if(inside(a,r)||inside(b,r))return true;
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q]of [[-dx,a.x-r.x-.01],[dx,r.x+r.w-.01-a.x],[-dy,a.y-r.y-.01],[dy,r.y+r.h-.01-a.y]]){
  if(Math.abs(p)<1e-9){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}
 }
 return lo<hi&&hi>0&&lo<1;
}
export function roomPath(room,from,to){
 if(room.id==='neo')return [from,to];
 const b=roomBlueprint(room),local=p=>({x:(p.x-room.x)/b.sx,y:(p.y-room.y)/b.sy}),world=p=>({x:room.x+p.x*b.sx,y:room.y+p.y*b.sy});
 const start=local(from),finish=local(to),blocks=b.obstacles.map(inflate),clear=(a,z)=>!blocks.some(r=>crosses(a,z,r));
 if(clear(start,finish))return [from,to];
 const nodes=[start,finish];
 for(const r of blocks)for(const p of [{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x,y:r.y+r.h},{x:r.x+r.w,y:r.y+r.h}])if(p.x>=12&&p.x<=(b.localWidth||320)-12&&p.y>=48&&p.y<=(b.localHeight||260)-21&&!blocks.some(o=>inside(p,o)))nodes.push(p);
 const distance=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();distance[0]=0;
 for(let n=0;n<nodes.length;n++){
  let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||distance[i]<distance[current]))current=i;
  if(current<0||!Number.isFinite(distance[current]))break;if(current===1)break;visited.add(current);
  for(let i=1;i<nodes.length;i++){if(visited.has(i)||!clear(nodes[current],nodes[i]))continue;const next=distance[current]+Math.hypot(nodes[current].x-nodes[i].x,nodes[current].y-nodes[i].y);if(next<distance[i]){distance[i]=next;previous[i]=current;}}
 }
 if(!Number.isFinite(distance[1]))return [from]; // Never route through a solid machine.
 const path=[];for(let i=1;i!==-1;i=previous[i])path.unshift(world(nodes[i]));return path;
}
export function pathIsClear(room,path){const b=roomBlueprint(room),local=p=>({x:(p.x-room.x)/b.sx,y:(p.y-room.y)/b.sy});return path.every((p,i)=>!i||!b.obstacles.map(inflate).some(r=>crosses(local(path[i-1]),local(p),r)));}
