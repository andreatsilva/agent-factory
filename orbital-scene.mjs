import {PAGES,SPRITES,FALLBACK} from './orbital-assets.mjs';
import {orbitalRooms,orbitalBays,corridorTo,roomActivity,createMotionTracker} from './orbital-map.mjs';
import {roomBlueprint} from './orbital-rooms.mjs';
const hash=value=>{let n=[...String(value)].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;};
export function createOrbitalScene(ctx,onLoad=()=>{},options={}){
 const images=new Map(),motion=createMotionTracker();let failed=false;
 const makeCanvas=options.makeCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
 const load=options.loadImage||(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;}));
 const pending=Object.entries({...PAGES,fallback:FALLBACK}).map(async([id,url])=>{try{images.set(id,await load(url));onLoad();}catch{failed=true;onLoad();}});
 const ready=Promise.all(pending);
 function sprite(id,x,y,w,h,target=ctx){const s=SPRITES[id],image=s&&images.get(s.page);if(!image)return false;const f=s.frame;target.drawImage(image,f.x,f.y,f.w,f.h,Math.round(x),Math.round(y),Math.round(w??f.w),Math.round(h??f.h));options.onSprite?.(id);return true;}
 function base(layout={bays:[]}){
  if(!images.has('atlases/structures_01.png'))return null;
  const surface=makeCanvas(1448,670),c=surface.getContext('2d');c.imageSmoothingEnabled=false;
  for(const r of orbitalRooms(layout)){const f=roomBlueprint(r).floor;sprite(f.id,f.x,f.y,f.w,f.h,c);}return surface;
 }
 function background(w,h,time,camera,{reduced=false}={}){
  const t=reduced?0:time;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#020912';ctx.fillRect(0,0,w,h);
  for(let i=0;i<420;i++){const n=hash('star'+i),depth=.2+i%4*.23,x=((n%10007/10007*w-camera.x*.025*depth-t*.0006*depth)%w+w)%w,y=(((n>>>12)%10007/10007*h-camera.y*.018*depth)%h+h)%h;ctx.globalAlpha=.28+(i%5)*.1+(reduced?0:Math.sin(t/1700+i)*.12);ctx.fillStyle=i%5?'#bbd7ec':'#6fafff';ctx.fillRect(Math.round(x),Math.round(y),i%41?1:2,i%41?1:2);if(i%81===0){ctx.globalAlpha=.28;ctx.fillRect(Math.round(x)-3,Math.round(y),7,1);ctx.fillRect(Math.round(x),Math.round(y)-3,1,7);}}
  ctx.globalAlpha=.9;const dx=(camera.x-724)*.045,dy=(camera.y-320)*.03;
  sprite('planet_or_asteroid_158',-100-dx,h*.25-dy,460,245);sprite('asteroid_or_star_cluster_166',w*.75-dx,h*.04-dy,180,179);sprite('planet_or_asteroid_168',w*.77-dx,h*.56-dy,390,392);ctx.globalAlpha=1;
  for(let i=0;i<9;i++){const x=(hash('rock'+i)%1000)/1000*w,y=(hash('rock-y'+i)%1000)/1000*h;const s=25+i%3*14;sprite('asteroid_or_star_cluster_084',x-dx*.5+Math.sin(t/18000+i)*3,y-dy*.5,s,s);}
  for(const [id,x,y,scale]of [['spacecraft_128',.25,.13,.48],['spacecraft_146',.89,.33,.65],['spacecraft_172',.61,.18,.5]]){const f=SPRITES[id].frame;sprite(id,w*x-dx+Math.sin(t/16000+x)*12,h*y-dy+Math.cos(t/21000+y)*4,f.w*scale,f.h*scale);}
 }
 function corridor(from,to){
  const horizontal=Math.abs(to.x-from.x)>Math.abs(to.y-from.y),length=Math.hypot(to.x-from.x,to.y-from.y);if(length<1)return;
  ctx.save();ctx.translate(from.x,from.y);ctx.rotate(Math.atan2(to.y-from.y,to.x-from.x)-(horizontal?0:Math.PI/2));
  if(horizontal){ctx.beginPath();ctx.rect(0,-15,length,30);ctx.clip();for(let x=0;x<length;x+=100)sprite('corridor_horizontal_08',x,-15,104,30);}
  else{ctx.beginPath();ctx.rect(-15,0,30,length);ctx.clip();for(let y=0;y<length;y+=90)sprite('corridor_vertical_14',-15,y,30,94);}
  ctx.restore();
 }
 function deck(b){const f=b.floor;sprite(f.id,f.x,f.y,f.w,f.h);}
 function deckLight(b,active,time,selected){
  const r=b.room;ctx.save();ctx.translate(r.x,r.y);ctx.scale(b.sx,b.sy);
  // Stepped pools of reflected light keep the supplied deck texture and hard pixel edges.
  for(let i=0;i<4;i++){ctx.globalAlpha=(active?.035:.014)*(1-i*.16);ctx.fillStyle=b.light;ctx.fillRect(39+i*5,145+i*4,98-i*10,75-i*8);ctx.fillRect(183+i*5,145+i*4,98-i*10,75-i*8);}
  ctx.globalAlpha=.24;ctx.fillStyle='#010810';ctx.fillRect(30,80,5,147);ctx.fillRect(285,80,5,147);ctx.fillRect(35,80,250,4);
  ctx.globalAlpha=active?.72+.15*Math.sin(time/1100):.28;ctx.fillStyle=b.light;
  for(const x of [35,281])for(let y=91;y<218;y+=25)ctx.fillRect(x,y,4,9);
  if(selected){ctx.globalAlpha=.8;ctx.strokeStyle='#ffe39a';ctx.lineWidth=2;for(const [x,y,dx,dy]of [[29,86,1,1],[291,86,-1,1],[29,230,1,-1],[291,230,-1,-1]]){ctx.beginPath();ctx.moveTo(x+dx*13,y);ctx.lineTo(x,y);ctx.lineTo(x,y+dy*13);ctx.stroke();}}
  ctx.restore();
 }
 function doors(b){
  const r=b.room;
  if(b.vertical){corridor({x:b.entry.x,y:r.y+20*b.sy},{x:b.entry.x,y:r.y+65*b.sy});corridor({x:b.entry.x,y:r.y+230*b.sy},{x:b.entry.x,y:r.y+270*b.sy});}
  else for(const x of [r.x,r.x+r.w])corridor({x:x-20*b.sx,y:b.entry.y},{x:x+20*b.sx,y:b.entry.y});
 }
 function foreground(b){
  const f=b.floor,front=f.y+f.h-26*b.sy;ctx.save();ctx.beginPath();
  if(b.vertical){ctx.rect(f.x,front,146*b.sx,30*b.sy);ctx.rect(f.x+174*b.sx,front,f.w-174*b.sx,30*b.sy);}else ctx.rect(f.x,front,f.w,30*b.sy);
  ctx.clip();sprite(f.id,f.x,f.y,f.w,f.h);ctx.restore();
 }
 function plate(r,activity,selected){
  const w=Math.min(r.w-24,245),x=Math.round(r.x+(r.w-w)/2),y=Math.round(r.y+r.h+4),color=({ACTIVE:'#8fffc0',INBOUND:'#83dcf3',ATTENTION:'#f3c77e',READY:'#9db7a5',PAUSED:'#859386',OFFLINE:'#859386'})[activity.status];
  ctx.fillStyle='#03110ff2';ctx.fillRect(x,y,w,30);ctx.strokeStyle=selected?'#ffe59b':'#486452';ctx.lineWidth=selected?2:1;ctx.strokeRect(x+.5,y+.5,w,30);
  ctx.fillStyle=color;ctx.fillRect(x+7,y+7,5,5);ctx.font='bold 10px "Courier New",monospace';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle=selected?'#ffe59b':'#d6dfbf';ctx.fillText(r.name.length>30?r.name.slice(0,29)+'…':r.name,x+18,y+10);ctx.textAlign='right';ctx.fillStyle='#a5c8ad';ctx.fillText(String(activity.crew),x+w-7,y+10);
  ctx.font='bold 8px "Courier New",monospace';ctx.textAlign='left';ctx.fillStyle=color;
  const detail=activity.status==='ACTIVE'?`${activity.working} WORK · ${activity.inspecting} QA · ${activity.inbound} INBOUND`:activity.status==='INBOUND'?`${activity.inbound} ARRIVING`:activity.status==='ATTENTION'?`${activity.error} NEED ATTENTION`:`${activity.crew} ASSIGNED`;
  ctx.fillText(activity.status+' · '+detail,x+7,y+23);
 }
 function equipment(o,active,time){
  ctx.fillStyle='#01060855';ctx.beginPath();ctx.moveTo(o.ground.x-o.w*.36,o.depth-3);ctx.lineTo(o.ground.x+o.w*.36,o.depth-3);ctx.lineTo(o.ground.x+o.w*.36+9,o.depth+7);ctx.lineTo(o.ground.x-o.w*.36+9,o.depth+7);ctx.closePath();ctx.fill();
  ctx.fillStyle='#01060885';ctx.beginPath();ctx.ellipse(o.ground.x,o.depth-1,o.w*.4,5,0,0,Math.PI*2);ctx.fill();
  sprite(o.id,o.x,o.y,o.w,o.h);
  if(o.kind==='fabricator'){
   // Reuse a supplied cargo sprite on the supplied machine's central conveyor.
   for(let i=0;i<2;i++){const phase=((active?time/5200:0)+i*.5)%1;sprite('industrial_server_or_tower_070',o.x+o.w*(.38+phase*.26),o.y+o.h*.39-9,16,12);}
  }
  if(!active||!o.screen)return;
  ctx.save();ctx.globalAlpha=.12+.04*Math.sin(time/700);ctx.fillStyle='#7effb5';ctx.fillRect(Math.round(o.x+o.w*.18),Math.round(o.y+o.h*.22+(time/110)%Math.max(4,o.h*.25)),Math.round(o.w*.6),1);
  ctx.globalAlpha=.8;ctx.fillRect(Math.round(o.x+o.w*.8),Math.round(o.y+o.h*.76),2,2);ctx.restore();
  if(o.id==='research_glass_dome'||o.id==='three_agent_pods'){
   ctx.save();ctx.globalAlpha=.45;ctx.fillStyle='#b9ffd2';
   for(let i=0;i<6;i++){const phase=(time/2600+i/6)%1;ctx.fillRect(Math.round(o.x+o.w*(.28+(i%3)*.2)),Math.round(o.y+o.h*(.68-phase*.38)),1,2);}
   ctx.restore();
  }
 }
 function draw({layout,agents=[],running=false,online=false,time=0,now=Date.now(),reduced=false,preview=null,zoom=1,selectedRoom=null,crewFocus=false}){
  ctx.imageSmoothingEnabled=false;const powered=running&&online,t=reduced?0:time;
  const rooms=orbitalRooms(layout),blueprints=rooms.map(roomBlueprint),queue=[];
  if(!['atlases/structures_01.png','atlases/machinery_01.png','atlases/screens_01.png','atlases/rooms_01.png'].every(id=>images.has(id))){if(images.has('fallback'))ctx.drawImage(images.get('fallback'),8,7);return;}
  const drawn=[];
  for(const a of agents){if(a.deactivated||a.state==='CONNECTING')continue;const p=motion.sample(a,layout,now,powered);a._x=p.x;a._y=p.y;drawn.push({a,p});}
  const activity=roomActivity(rooms,drawn,{powered,online});
  const segments=new Set();
  for(const r of rooms){const path=corridorTo(r);for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],key=[a.x,a.y,b.x,b.y].map(Math.round).join(',');if(!segments.has(key)){segments.add(key);corridor(a,b);}}}
  sprite('floor_platform_30',590,355,235,100);
  for(const b of blueprints){deck(b);doors(b);const state=activity.get(b.room.id),active=powered&&(state.working>0||state.inspecting>0);deckLight(b,active,t,b.room.id===selectedRoom);
   for(const o of b.objects)queue.push({depth:o.depth,draw:()=>equipment(o,active,t)});
   queue.push({depth:b.floor.y+b.floor.h,draw:()=>foreground(b)});
   if(active&&b.room.id==='research')queue.push({depth:b.room.y+b.room.h*.6,draw:()=>{
    const x=b.room.x+b.room.w*(.71+Math.sin(t/2100)*.09),y=b.room.y+b.room.h*(.44+Math.cos(t/2100)*.035);
    ctx.fillStyle='#01060866';ctx.beginPath();ctx.ellipse(x+11,y+39,8,3,0,0,Math.PI*2);ctx.fill();sprite('utility_drone_001',x,y,23,20);
   }});
  }
  queue.push({depth:408,draw:()=>{const s=SPRITES.neo_command_core;sprite('neo_command_core',573+s.trim[0],s.trim[1]);
   if(powered){ctx.save();ctx.globalAlpha=.1;ctx.fillStyle='#8cffa6';ctx.fillRect(651,204+(t/60)%126,103,2);ctx.restore();}
  }});
  for(const {a,p}of drawn)queue.push({worker:true,depth:p.y,draw:()=>{
   const active=powered&&!p.moving&&['WORKING','INSPECTING'].includes(a.state),seed=hash(a.id),id=(active?'worker_operating_pose_':'worker_standing_pose_')+String(1+seed%(active?13:14)).padStart(2,'0'),s=SPRITES[id],height=40,width=s.frame.w/s.frame.h*height;
   const bob=powered&&!reduced?(p.moving?Math.round(Math.sin(t/95+seed)*1.2):active?Math.round(Math.sin(t/210+seed)*.65):0):0;
   ctx.fillStyle='#01060988';ctx.beginPath();ctx.ellipse(Math.round(p.x),Math.round(p.y),7,2,0,0,Math.PI*2);ctx.fill();
   ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y)+bob);if(p.facing==='left')ctx.scale(-1,1);
   sprite(id,-width/2,-height,width,height);ctx.restore();
   if(a.selected||zoom>1.2){ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle='#08110ee8';ctx.fillRect(Math.round(p.x)-22,Math.round(p.y)-50,44,9);ctx.fillStyle='#d9e9bb';ctx.fillText(a.id,Math.round(p.x),Math.round(p.y)-45);}
   if(a.selected){ctx.strokeStyle='#ffe39a';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.round(p.x),Math.round(p.y)+1,10,3,0,0,Math.PI*2);ctx.stroke();}
  }});
  // Ground contact, not sprite top-left, determines which object occludes a worker.
  for(const entity of queue.sort((a,b)=>a.depth-b.depth)){ctx.save();if(crewFocus&&!entity.worker)ctx.globalAlpha=.23;entity.draw();ctx.restore();}
  if(preview){const all={...layout,bays:[...layout.bays,preview]},r=orbitalBays(all).find(r=>r.id===preview.id),b=roomBlueprint(r),path=corridorTo(r);ctx.save();ctx.globalAlpha=.55;for(let i=1;i<path.length;i++)corridor(path[i-1],path[i]);deck(b);doors(b);for(const o of [...b.objects].sort((a,b)=>a.depth-b.depth))equipment(o,false,0);foreground(b);ctx.restore();ctx.font='bold 12px monospace';ctx.fillStyle='#ffe39a';ctx.textAlign='center';ctx.fillText('BUILD PREVIEW',r.x+r.w/2,r.y+r.h+20);}
  motion.prune(agents);
  // Room status stays legible when travelling crew cross a foreground doorway.
  for(const r of rooms)plate(r,activity.get(r.id),r.id===selectedRoom);
  if(failed){ctx.font='11px monospace';ctx.fillStyle='#e5c87a';ctx.textAlign='left';ctx.fillText('Some orbital artwork could not load · reload to retry',25,-10);}
  return {rooms:rooms.length,equipment:blueprints.reduce((sum,b)=>sum+b.objects.length,0),workers:drawn.length};
 }
 return {ready,background,draw,sprite,base,get failed(){return failed;}};
}
