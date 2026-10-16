import {PAGES,SPRITES,PLACEMENTS,FALLBACK,CONNECTIONS} from './orbital-assets.mjs';
import {orbitalRooms,orbitalBays,department,createMotionTracker} from './orbital-map.mjs';
const hash=value=>{let n=[...String(value)].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;};
export function createOrbitalScene(ctx,onLoad=()=>{},options={}){
 const images=new Map(),motion=createMotionTracker();let cached=null,failed=false;
 const makeCanvas=options.makeCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});
 const load=options.loadImage||(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;}));
 const pending=Object.entries({...PAGES,fallback:FALLBACK,connections:CONNECTIONS}).map(async([id,url])=>{try{images.set(id,await load(url));onLoad();}catch{failed=true;onLoad();}});
 const ready=Promise.all(pending);
 function sprite(id,x,y,w,h,target=ctx){const s=SPRITES[id],image=s&&images.get(s.page);if(!image)return false;const f=s.frame;target.drawImage(image,f.x,f.y,f.w,f.h,Math.round(x),Math.round(y),Math.round(w??f.w),Math.round(h??f.h));return true;}
 function base(){
  if(cached)return cached;
  if(!images.has('connections')||!images.has('atlases/rooms_01.png'))return null;
  const surface=makeCanvas(1448,640),c=surface.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(images.get('connections'),0,0);
  for(const p of [...PLACEMENTS].sort((a,b)=>a.layer-b.layer)){const s=SPRITES[p.sprite_id];sprite(p.sprite_id,p.world_xy[0]+s.trim[0],p.world_xy[1]+s.trim[1],undefined,undefined,c);}
  cached=surface;return cached;
 }
 function background(w,h,time,camera,{reduced=false}={}){
  const t=reduced?0:time;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#020912';ctx.fillRect(0,0,w,h);
  for(let i=0;i<420;i++){const n=hash('star'+i),depth=.2+i%4*.23,x=((n%10007/10007*w-camera.x*.025*depth-t*.0006*depth)%w+w)%w,y=(((n>>>12)%10007/10007*h-camera.y*.018*depth)%h+h)%h;ctx.globalAlpha=.28+(i%5)*.1+(reduced?0:Math.sin(t/1700+i)*.12);ctx.fillStyle=i%5?'#bbd7ec':'#6fafff';ctx.fillRect(Math.round(x),Math.round(y),i%41?1:2,i%41?1:2);if(i%81===0){ctx.globalAlpha=.28;ctx.fillRect(Math.round(x)-3,Math.round(y),7,1);ctx.fillRect(Math.round(x),Math.round(y)-3,1,7);}}
  ctx.globalAlpha=.9;const dx=(camera.x-724)*.045,dy=(camera.y-320)*.03;
  sprite('planet_or_asteroid_158',-100-dx,h*.25-dy,460,245);sprite('asteroid_or_star_cluster_166',w*.75-dx,h*.04-dy,180,179);sprite('planet_or_asteroid_168',w*.77-dx,h*.56-dy,390,392);ctx.globalAlpha=1;
  for(let i=0;i<9;i++){const x=(hash('rock'+i)%1000)/1000*w,y=(hash('rock-y'+i)%1000)/1000*h;const s=25+i%3*14;sprite('asteroid_or_star_cluster_084',x-dx*.5+Math.sin(t/18000+i)*3,y-dy*.5,s,s);}
  for(const [id,x,y,scale]of [['spacecraft_128',.25,.13,.48],['spacecraft_146',.89,.33,.65],['spacecraft_172',.61,.18,.5]]){const f=SPRITES[id].frame;sprite(id,w*x-dx+Math.sin(t/16000+x)*12,h*y-dy+Math.cos(t/21000+y)*4,f.w*scale,f.h*scale);}
 }
 function connectors(room,layout,time,powered){
  const peers=orbitalBays(layout).filter(r=>!r.embedded&&r.side===room.side&&r.index<room.index).sort((a,b)=>b.index-a.index),previous=peers[0];
  const horizontal=['east','west'].includes(room.side),negative=['west','north'].includes(room.side);
  if(horizontal){const y=room.y+room.h*.76,edge=previous?(negative?previous.x:previous.x+previous.w):(negative?10:1440),end=negative?room.x+room.w:room.x,left=Math.min(edge,end),right=Math.max(edge,end);for(let x=left;x<right;x+=110)sprite('corridor_horizontal_08',x,y-17,Math.min(112,right-x+2),44);}
  else{const x=room.x+room.w/2,edge=previous?(negative?previous.y:previous.y+previous.h):(negative?15:610),end=negative?room.y+room.h:room.y+45,top=Math.min(edge,end),bottom=Math.max(edge,end);for(let y=top;y<bottom;y+=90)sprite('corridor_vertical_14',x-18,y,36,Math.min(92,bottom-y+2));}
 }
 function expansion(room){
  sprite('floor_platform_29',room.x,room.y+30,room.w,room.h-30);
  if(room.type==='servers'){for(let i=0;i<4;i++)sprite('industrial_server_or_tower_045',room.x+45+i*55,room.y+40,35,105);sprite('three_agent_pods',room.x+65,room.y+105,185,90);}
  else if(room.type==='storage'){for(let i=0;i<6;i++)sprite('industrial_module_080',room.x+38+(i%3)*85,room.y+75+Math.floor(i/3)*65,60,53);}
  else{sprite('green_terminal_display_041',room.x+100,room.y+50,120,66);sprite('workstation_console_062',room.x+55,room.y+130,210,55);sprite('industrial_server_or_tower_046',room.x+20,room.y+72,29,85);sprite('industrial_server_or_tower_046',room.x+270,room.y+72,29,85);}
 }
 function plate(r,agents,powered,selected){
  const count=agents.filter(a=>!a.deactivated&&(a.destination===r.id||a.destination===r.moduleId||(!a.destination&&a.home===department(r)))).length;
  const w=Math.min(r.w-24,245),x=r.x+(r.w-w)/2,y=r.y+r.h-32;
  ctx.fillStyle='#03110fea';ctx.fillRect(Math.round(x),Math.round(y),w,22);ctx.strokeStyle=selected?'#ffe59b':'#486452';ctx.lineWidth=1;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w,22);
  ctx.fillStyle=powered?'#75e9ac':'#76887d';ctx.fillRect(Math.round(x)+7,Math.round(y)+8,5,5);ctx.font='bold 11px "Courier New",monospace';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#d6dfbf';ctx.fillText(r.name.length>26?r.name.slice(0,25)+'…':r.name,Math.round(x)+18,Math.round(y)+11);ctx.textAlign='right';ctx.fillStyle='#85b998';ctx.fillText(String(count),Math.round(x+w)-7,Math.round(y)+11);
 }
 function machinery(r,active,time){
  if(!active)return;
  const x=r.x+r.w*.32,y=r.y+r.h*.4,w=r.w*.37;
  ctx.save();ctx.globalAlpha=.08+.04*Math.sin(time/650);ctx.fillStyle='#82ffc5';ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),3);ctx.globalAlpha=.23;ctx.fillRect(Math.round(x),Math.round(y+((time/95)%18)),Math.round(w),1);ctx.restore();
  for(let i=0;i<3;i++){ctx.fillStyle=(Math.floor(time/250)+i)%3?'#4abf8e':'#d9ffad';ctx.fillRect(Math.round(r.x+30+i*7),Math.round(r.y+r.h*.81),3,2);}
 }
 function draw({layout,agents=[],running=false,online=false,time=0,now=Date.now(),reduced=false,preview=null,zoom=1,selectedRoom=null}){
  ctx.imageSmoothingEnabled=false;const powered=running&&online,t=reduced?0:time;
  const surface=base();if(surface)ctx.drawImage(surface,0,0);else if(images.has('fallback'))ctx.drawImage(images.get('fallback'),8,7);
  const rooms=orbitalRooms(layout),extra=rooms.filter(r=>r.expansion&&!r.embedded);
  for(const room of extra)connectors(room,layout,t,powered);
  for(const room of extra)expansion(room);
  if(preview){const all={...layout,bays:[...layout.bays,preview]},r=orbitalBays(all).find(r=>r.id===preview.id);ctx.save();ctx.globalAlpha=.55;connectors(r,all,t,false);expansion(r);ctx.restore();ctx.font='bold 12px monospace';ctx.fillStyle='#ffe39a';ctx.textAlign='center';ctx.fillText('BUILD PREVIEW',r.x+r.w/2,r.y+r.h+20);}
  for(const r of rooms){const active=powered&&agents.some(a=>!a.deactivated&&['WORKING','INSPECTING'].includes(a.state)&&(a.destination===r.id||a.destination===department(r)));machinery(r,active,t);plate(r,agents,powered,r.id===selectedRoom);if(active&&r.id==='research')sprite('utility_drone_001',r.x+240,r.y+125+Math.sin(t/750)*2,23,20);}
  // Illuminate the supplied NEO chamber; there is no second floating avatar in the world.
  if(powered){ctx.save();ctx.globalAlpha=.1;ctx.fillStyle='#8cffa6';ctx.fillRect(651,204+(t/60)%126,103,2);ctx.restore();for(let i=0;i<6;i++){ctx.fillStyle=(Math.floor(t/190)+i)%6<3?'#a3f28a':'#3c7655';ctx.fillRect(675+i*10,370,6,3);}}
  const drawn=[];
  for(const a of agents){if(a.deactivated||a.state==='CONNECTING')continue;const p=motion.sample(a,layout,now,powered);
   a._x=p.x;a._y=p.y;drawn.push({a,p});
  }
  for(const {a,p}of drawn.sort((a,b)=>a.p.y-b.p.y)){
   const active=powered&&!p.moving&&['WORKING','INSPECTING'].includes(a.state),seed=hash(a.id),id=(active?'worker_operating_pose_':'worker_standing_pose_')+String(1+seed%(active?13:14)).padStart(2,'0'),s=SPRITES[id],height=33,width=s.frame.w/s.frame.h*height;
   const bob=powered&&!reduced?(p.moving?Math.round(Math.sin(t/95+seed)*1.2):active?Math.round(Math.sin(t/210+seed)*.65):0):0;
   ctx.fillStyle='#01060988';ctx.fillRect(Math.round(p.x)-7,Math.round(p.y)-1,14,3);ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y)+bob);if(p.facing==='left')ctx.scale(-1,1);sprite(id,-width/2,-height,width,height);ctx.restore();
   ctx.fillStyle=a.selected?'#ffe39a':active?'#8bffb8':p.moving?'#77d6ef':'#b1b48a';ctx.fillRect(Math.round(p.x)-3,Math.round(p.y)-39,6,2);
   if(a.selected||zoom>1.2){ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle='#08110ee8';ctx.fillRect(Math.round(p.x)-22,Math.round(p.y)-50,44,9);ctx.fillStyle='#d9e9bb';ctx.fillText(a.id,Math.round(p.x),Math.round(p.y)-45);}
   if(a.selected){ctx.strokeStyle='#ffe39a';ctx.lineWidth=1;ctx.strokeRect(Math.round(p.x)-13,Math.round(p.y)-36,26,40);}
  }
  motion.prune(agents);
  if(failed){ctx.font='11px monospace';ctx.fillStyle='#e5c87a';ctx.textAlign='left';ctx.fillText('Some orbital artwork could not load · reload to retry',25,-10);}
 }
 return {ready,background,draw,sprite,base,get failed(){return failed;}};
}
