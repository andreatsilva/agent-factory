// Procedural pixel machinery. Power animates empty belts; cargo appears only for a real job.
const ACTIVE={website:['brief','building'],research:['research','validation'],product:['building','publishing'],quality:['quality'],automation:[],ops:[]};
export function createIndustrialArt(ctx,g){
 const {pxRect:R,strokeRect:S,line:L,text:T,drawConsole:console,drawCrate:crate,drawDesk:desk,C}=g;
 function bolts(x,y,w){for(let i=6;i<w;i+=24){R(x+i,y,2,2,'#899078');R(x+i,y+3,2,1,'#101b17');}}
 function hazard(x,y,w){R(x,y,w,5,'#17211a');for(let i=0;i<w-3;i+=10){R(x+i,y,5,3,'#a49651');R(x+i+2,y+3,5,2,'#a49651');}}
 function machine(x,y,w,h,name,active,time){
  ctx.fillStyle='#01070c85';ctx.beginPath();ctx.moveTo(x+4,y+h);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w+29,y+h+17);ctx.lineTo(x+22,y+h+17);ctx.fill();
  R(x+7,y+9,w+9,h,'#040b1270');R(x-3,y+h-3,w+7,7,'#1a2e3b');R(x,y+h+3,w,2,'#6e8286');
  ctx.fillStyle='#809297';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+13,y-17);ctx.lineTo(x+w+13,y-17);ctx.lineTo(x+w,y);ctx.fill();
  ctx.fillStyle='#253e4d';ctx.beginPath();ctx.moveTo(x+w,y);ctx.lineTo(x+w+13,y-17);ctx.lineTo(x+w+13,y+h-17);ctx.lineTo(x+w,y+h);ctx.fill();
  L(x+13,y-17,x+w+13,y-17,'#c5cebb',2);L(x+w+13,y-15,x+w+13,y+h-18,'#5e7882',1);
  for(let vx=x+18;vx<x+w-7;vx+=7){L(vx,y-12,vx+7,y-12,'#344d5a',2);L(vx-3,y-7,vx+4,y-7,'#576f79',1);}
  for(let yy=y+7;yy<y+h-8;yy+=9)L(x+w+4,yy,x+w+10,yy-8,'#526d79',2);
  R(x,y,w,h,'#485c66');R(x+3,y+3,w-6,h-6,'#304550');R(x,y,w,3,'#a4ada5');R(x+w-4,y+4,4,h-4,'#203440');bolts(x,y+6,w);
  for(let i=8;i<w-10;i+=11){R(x+i,y+11,5,1,'#82928e22');R(x+i+2,y+h-15,3,1,'#b18a4e33');}
  S(x+8,y+15,w-20,h-27,'#78918c',1);R(x+10,y+17,w-24,h-31,'#071a20');L(x+10,y+17,x+w-15,y+17,'#01080e',2);
  for(let i=0;i<4;i++)L(x+14,y+20+i*4,x+w-20,y+20+i*4,'#304536',1);
  R(x+w-13,y+13,4,4,active?'#b6da89':'#8d793b');R(x+w-13,y+22,4,4,'#17281d');R(x+4,y+4,2,h-9,'#829996');
  if(active){R(x+9,y+h+7,w-19,3,'#86c1a51c');R(x+14,y+h+10,w-29,3,'#86c1a50c');}
  if(active){const t=Math.floor(time/180)%4;R(x+15+t*5,y+22,8,3,'#9abb7e');}
  T(name,x+w/2,y+h-9,'#d0cbb0',6,'center');hazard(x+6,y+h-3,w-14);
 }
 function belt(x,y,length,vertical,state,loads=false){
  ctx.save();ctx.translate(x,y);if(vertical)ctx.rotate(Math.PI/2);
  R(8,13,length,23,'#03091199');R(0,-3,length,25,'#435660');R(0,0,length,18,'#1c2c36');R(0,1,length,2,'#bac4b4');R(0,16,length,2,'#93a5a0');R(0,21,length,8,'#283c47');R(0,28,length,2,'#152937');
  const shift=state.powered?(state.time*(loads?.026:.014))%12:0;
  ctx.save();ctx.beginPath();ctx.rect(5,3,length-10,12);ctx.clip();
  for(let p=-12;p<length+12;p+=12){R(p+shift,3,2,12,'#657575');R(p+shift+2,4,2,10,'#344953');}
  if(loads){const offset=(state.time*.026)%92;for(let p=-92;p<length+50;p+=92){R(p+offset,4,21,10,'#070d09');R(p+offset,1,18,10,'#777c50');S(p+offset+2,3,14,6,'#bab887',1);R(p+offset+7,1,3,9,'#303d29');}}
  ctx.restore();
  for(const end of [0,length-7]){R(end,0,7,18,'#a58b5f');R(end+2,3,3,12,'#435055');}
  for(let p=20;p<length-10;p+=48){R(p,23,6,11,'#5b7480');R(p+1,24,2,8,'#b2b79c');R(p-2,33,11,3,'#172a34');L(p+6,24,p+29,28,'#132732',2);}
  R(-8,4,8,10,'#354b39');R(-6,7,3,3,state.powered?'#9eb477':'#424637');ctx.restore();
 }
 function piston(x,y,active,time){
  R(x-11,y-40,22,10,'#8c7352');R(x-6,y-31,12,22,'#293b46');L(x,y-29,x,y-5,'#c1c7b7',4);L(x-2,y-29,x-2,y-5,'#667e86',1);
  const drop=active?Math.round((Math.sin(time/280)+1)*5):0;R(x-15,y-12+drop,30,7,'#576b50');hazard(x-15,y-10+drop,30);
  if(active&&drop>8){R(x+18,y+3,2,2,'#dac575');R(x-20,y-1,2,2,'#b2ce81');}
 }
 function arm(x,y,active,time){
  const reach=active?Math.round(Math.sin(time/420)*8):0;
  R(x-11,y+2,22,8,'#142834');R(x-8,y,16,6,'#75898d');L(x,y,x-10,y-23,'#a28253',6);L(x-2,y,x-12,y-23,'#d0b87d',1);R(x-13,y-26,7,7,'#bbc4b3');L(x-10,y-23,x+19+reach,y-18,'#c3a86e',5);R(x+16+reach,y-20,7,7,'#4b636b');L(x+19+reach,y-15,x+19+reach,y-7,'#c0ccbf',2);R(x+15+reach,y-7,9,3,'#415c66');
 }
 function aisle(x,y,w,label){L(x,y,x+w,y,'#6c7046',1);for(let i=0;i<w;i+=24)R(x+i,y+3,9,2,'#464d31');if(label)T(label,x+8,y+7,'#7f926d',6);}
 function rack(x,y,w,h){R(x+3,y+4,w,h,'#050d08');R(x,y,w,h,'#41513e');R(x+3,y+3,w-6,h-6,'#112319');for(let yy=y+7;yy<y+h-4;yy+=9){R(x+6,yy,w-12,5,'#273c2b');R(x+8,yy+1,2,2,'#8eb477');L(x+w-16,yy+2,x+w-7,yy+2,'#576b4c',1);}}
 function proofTable(x,y,light,accent){
  // Raised proofing screen: its casing and supports give the artwork a physical workstation.
  R(x+7,y+9,101,49,'#020a1270');
  for(const dx of [7,81]){R(x+dx,y+41,5,11,'#314b59');R(x+dx,y+42,2,8,'#96a8a0');R(x+dx-2,y+51,10,3,'#152b38');}
  R(x-3,y-3,99,49,'#5a727c');R(x-3,y-3,99,2,'#c0c7b7');R(x-3,y+44,99,4,'#233b49');R(x+96,y,4,46,'#162d3c');
  R(x,y,93,43,light?'#d9cca2':'#173648');R(x+2,y+2,89,2,light?'#efe5bd':'#51757d');
  R(x+7,y+10,43,3,light?'#506e70':accent);R(x+7,y+18,31,3,light?'#506e70':accent);S(x+62,y+7,20,24,'#c69b55',2);
  R(x+4,y+45,3,1,'#a9c7b3');R(x+88,y+45,3,1,'#a9c7b3');
 }
 function status(r,state,active){const x=r.x+r.w-85,y=r.y+34;T(!state.powered?'OFFLINE':active?'LINE ACTIVE':'STANDBY',x,y,active?'#aed890':'#a79965',6);R(x-8,y,4,4,active?'#a4d17e':state.powered?'#ad944d':'#514d3a');}
 function room(r,state){
  if(r.crewDepartment){
   const {x,y}=r;T('CREW BERTHS / '+r.crewDepartment.toUpperCase(),x+20,y+43,'#b4c7bb',7);
   for(let i=0;i<6;i++){rack(x+22+i*48,y+55,30,30);desk(x+19+i*48,y+133,'#84b8bd');}
   aisle(x+22,y+192,r.w-44,'READY FOR ASSIGNMENT');return true;
  }
  if(r.moduleId){
   const {x,y}=r,active=state.powered&&state.moduleActive;
   status(r,state,active);
   r.stations.forEach((name,i)=>machine(x+22+i*98,y+58,76,45,name,active,state.time));
   belt(x+24,y+113,r.w-48,false,state,active);
   if(r.moduleId==='thumbnails'){
    for(let i=0;i<2;i++)proofTable(x+27+i*135,y+148,i,r.accent);
   }else{for(let i=0;i<3;i++)desk(x+35+i*92,y+170,r.accent);}
   T(state.moduleLabel||'LOCAL WORKFLOW',x+22,y+43,r.accent,7);
   return true;
  }
  if(!Object.hasOwn(ACTIVE,r.id))return false;
  const active=state.powered&&ACTIVE[r.id].includes(state.stage),x=r.x,y=r.y;
  status(r,state,active);
  if(r.id==='website'){
   for(let i=0;i<4;i++){console(x+30+i*80,y+44,C.green);R(x+28+i*80,y+75,42,4,'#526043');}
   belt(x+38,y+112,r.w-80,false,state,active);machine(x+115,y+72,60,38,'COMPILE',active,state.time);machine(x+229,y+72,62,38,'BUILD',active,state.time);
   for(let i=0;i<3;i++)desk(x+42+i*95,y+176,C.green);rack(x+r.w-49,y+155,30,40);aisle(x+25,y+148,r.w-52,'ASSEMBLY / WALKWAY');
  }else if(r.id==='research'){
   for(let i=0;i<3;i++){console(x+37+i*98,y+45,C.cyan);R(x+34+i*98,y+75,43,5,'#455c43');}
   belt(x+30,y+119,r.w-68,false,state,active);machine(x+121,y+85,64,32,'SCAN',active,state.time);piston(x+230,y+118,active,state.time);
   machine(x+24,y+164,96,36,'EVIDENCE',active,state.time);console(x+150,y+166,C.cyan);console(x+246,y+164,C.cyan);aisle(x+22,y+150,r.w-46,'SORT / VALIDATE / ARCHIVE');
  }else if(r.id==='product'){
   machine(x+31,y+42,67,43,'INPUT',active,state.time);machine(x+133,y+42,69,43,'FABRICATE',active,state.time);machine(x+254,y+42,80,43,'PACKAGE',active,state.time);
   belt(x+31,y+102,r.w-65,false,state,active);piston(x+166,y+102,active,state.time);arm(x+256,y+105,active,state.time);
   aisle(x+22,y+153,r.w-45,'LINE 01 / ASSEMBLY → PACKING');console(x+43,y+164,C.green);console(x+171,y+164,C.green);for(let i=0;i<3;i++)crate(x+262+i*24,y+176);
  }else if(r.id==='quality'){
   console(x+30,y+40,C.cyan);console(x+267,y+40,C.cyan);belt(x+24,y+77,r.w-48,false,state,active);
   R(x+171,y+45,8,49,'#556c50');R(x+217,y+45,8,49,'#556c50');R(x+171,y+43,54,9,'#77866a');hazard(x+173,y+44,48);
   if(active){const scan=(Math.floor(state.time/100)%35);L(x+181+scan,y+55,x+181+scan,y+91,'#86d4a0',1);}
   T('QA SCAN',x+198,y+33,C.cyan,6,'center');aisle(x+23,y+120,r.w-46,'INSPECTION AISLE');
  }else if(r.id==='automation'){
   for(let i=0;i<3;i++)rack(x+27+i*50,y+43,35,61);machine(x+201,y+42,58,35,'RELAY',state.powered,state.time);machine(x+278,y+42,64,35,'POWER',state.powered,state.time);
   belt(x+203,y+111,145,false,state,false);aisle(x+23,y+97,r.w-49,'SERVICE ACCESS');
  }else if(r.id==='ops'){
   console(x+21,y+38,C.amber);console(x+105,y+38,C.amber);rack(x+221,y+34,36,30);T('QUEUE / DISPATCH',x+163,y+49,'#a49969',6,'center');
  }
  return true;
 }
 function infrastructure(state){
  belt(108,653,1070,false,state,state.powered&&['building','quality','publishing'].includes(state.stage));
  for(const x of [74,1204]){R(x,166,9,467,'#111e17');L(x+1,166,x+1,633,'#6a7860',2);L(x+6,166,x+6,633,'#324937',3);for(let y=180;y<620;y+=46){R(x-3,y,16,4,'#52634b');}}
  for(const [x,y] of [[495,165],[736,495]]){machine(x,y,43,61,'COOLANT',state.powered,state.time);const spin=state.powered?Math.floor(state.time/170)%4:0;S(x+8,y+21,22,22,'#74866a',1);L(x+11+spin,y+24,x+25-spin,y+39,'#78916e',2);L(x+25-spin,y+24,x+11+spin,y+39,'#78916e',2);}
  for(const [x,y] of [[499,253],[718,552]]){R(x,y,40,23,'#30422e');S(x,y,40,23,'#758263',1);crate(x+3,y-2);R(x+4,y+23,6,4,'#111b12');R(x+31,y+23,6,4,'#111b12');}
 }
 function reactor(x,y,state){
  const ellipse=(xx,yy,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(xx,yy,rx,ry,0,0,Math.PI*2);ctx.fill();};
  ellipse(x+7,y+21,112,53,'#02070bbf');
  for(let i=14;i>=0;i-=2)ellipse(x,y+i,103,49,i>6?'#1a2b34':'#526870');
  ellipse(x,y,99,46,'#86928a');ellipse(x,y+1,93,42,'#314953');
  // Segmented armoured rim, with front-facing ribs on the plinth.
  for(let i=0;i<20;i++){
   const a=i*Math.PI/10,xx=x+Math.cos(a)*97,yy=y+Math.sin(a)*44;
   L(xx,yy, x+Math.cos(a)*86,y+Math.sin(a)*38,'#152934',3);
   if(Math.sin(a)>.1){R(xx-2,yy+5,4,8,'#697b7d');R(xx,yy+6,1,6,'#a5afa0');}
  }
  ellipse(x,y,79,35,'#081a23');ellipse(x,y,73,31,state.powered?'#295b58':'#263b40');ellipse(x,y,65,26,'#07151d');
  ctx.save();ctx.strokeStyle=state.powered?'#8ed7bb':'#506864';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,70,29,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,xx=x+Math.cos(a)*91,yy=y+Math.sin(a)*40;
   R(xx-7,yy-6,14,9,'#233b45');R(xx-6,yy-8,12,4,'#ab9770');R(xx-3,yy-6,6,2,state.powered?'#d6deb2':'#655c49');
  }
  // Four copper heat exchangers frame a translucent diagnostic column.
  for(const dx of [-43,35]){R(x+dx+4,y-54,8,48,'#10242c');R(x+dx,y-58,8,49,'#8d734f');R(x+dx,y-58,2,48,'#cbb384');for(let yy=y-53;yy<y-10;yy+=7)L(x+dx,yy,x+dx+7,yy,'#4c5147',2);}
  ellipse(x,y-4,34,15,'#526f6c');ellipse(x,y-6,29,12,'#143d3c');
  if(state.powered){
   for(let i=0;i<12;i++){const a=i*Math.PI/6+state.time/4800;R(x+Math.cos(a)*55,y+Math.sin(a)*20,2,2,'#8ddda9');}
  }
  T('NEO // NEURAL LINK',x,y+30,'#ddd1ab',7,'center');
 }
 return {room,infrastructure,reactor};
}
