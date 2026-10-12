// Cached pixel materials and a layered space scene; no image downloads or external runtime.
export function createSceneArt(ctx){
 const surfaces=new Map();
 const palettes={steel:['#26333c','#34434d','#4f6069','#91a0a4'],lab:['#293d3c','#364f4b','#57716a','#95afa1'],workshop:['#393c34','#4a4d40','#686d57','#b0af87'],deck:['#222b34','#303d47','#4a5961','#89999d']};
 const seed=(x,y)=>{let v=Math.imul(x+17,374761393)^Math.imul(y+31,668265263);v=Math.imul(v^(v>>>13),1274126177);return (v>>>0)/4294967296;};
 const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
 function floor(x,y,w,h,kind='steel'){
  if(!surfaces.has(kind)){const tile=document.createElement('canvas');tile.width=tile.height=48;const c=tile.getContext('2d'),p=palettes[kind]||palettes.steel;
   c.fillStyle=p[0];c.fillRect(0,0,48,48);c.fillStyle=p[1];c.fillRect(2,2,44,44);c.fillStyle=p[2];c.fillRect(2,2,44,1);c.fillRect(2,3,1,42);c.fillStyle='#142128';c.fillRect(2,45,44,2);c.fillRect(45,2,2,45);
   for(let i=0;i<180;i++){const xx=3+Math.floor(seed(i,2)*41),yy=4+Math.floor(seed(i,7)*39);c.fillStyle=i%3?'#ffffff07':'#030b1015';c.fillRect(xx,yy,1+i%3,1);}
   for(const xx of [5,40])for(const yy of [5,40]){c.fillStyle='#15232a';c.fillRect(xx,yy,3,3);c.fillStyle=p[3];c.fillRect(xx,yy,2,1);}
   c.fillStyle='#82704d28';c.fillRect(30,36,9,2);c.fillRect(34,32,4,5);surfaces.set(kind,ctx.createPattern(tile,'repeat'));
  }
  ctx.fillStyle=surfaces.get(kind);ctx.fillRect(x,y,w,h);
  // Directional, stepped ambient occlusion beneath the rear and side walls.
  for(let i=0;i<4;i++){ctx.fillStyle=['#020a1370','#020a133c','#020a1320','#020a130c'][i];ctx.fillRect(x,y+i*5,w,5);ctx.fillRect(x+i*4,y,4,h);}
  ctx.fillStyle='#d9e1c208';ctx.fillRect(x+w*.58,y+22,w*.25,h-35);
 }
 const sky=document.createElement('canvas');sky.width=384;sky.height=224;const sc=sky.getContext('2d');
 for(let y=0;y<224;y+=2)for(let x=0;x<384;x+=2){const band=Math.exp(-Math.pow((y-128+Math.sin(x/67)*42)/37,2)),cloud=(Math.sin(x/21+y/28)+Math.sin(x/39-y/14)+2)/4,alpha=band*cloud*.22;if(alpha>.015){sc.fillStyle=`rgba(${26+Math.floor(cloud*15)},${56+Math.floor(cloud*40)},${69+Math.floor(cloud*49)},${alpha})`;sc.fillRect(x,y,2,2);}}
 const planet=document.createElement('canvas');planet.width=planet.height=128;const pc=planet.getContext('2d');
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const dx=(x-64)/59,dy=(y-64)/59,d=dx*dx+dy*dy;if(d>1)continue;const z=Math.sqrt(1-d),light=Math.max(0,(-dx*.5-dy*.35+z*.75)),terrain=(Math.sin(x/6+y/13)+Math.sin(y/4-x/11)+seed(x,y)*.35)>0.35;const shade=.15+light*.85;pc.fillStyle=terrain?`rgb(${Math.floor(75*shade)},${Math.floor(98*shade)},${Math.floor(86*shade)})`:`rgb(${Math.floor(30*shade)},${Math.floor(63*shade)},${Math.floor(81*shade)})`;pc.fillRect(x,y,1,1);if(d>.94&&light>.35){pc.fillStyle='#85b5b155';pc.fillRect(x,y,1,1);}}
 function space(w,h,time,camera){
  ctx.fillStyle='#050a14';ctx.fillRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
  const drift=time*.0015,ox=-((camera.x*.022+drift)%(w*.8)),oy=-camera.y*.018;
  ctx.drawImage(sky,ox,oy,w*1.6,h*1.5);ctx.drawImage(sky,ox+w*1.6,oy,w*1.6,h*1.5);
  ctx.globalAlpha=.62;ctx.drawImage(planet,w*.08-camera.x*.06,h*.62-camera.y*.045,170,170);ctx.globalAlpha=1;
  for(let i=0;i<230;i++){const depth=.2+(i%4)*.25,xx=((seed(i,3)*w-camera.x*.025*depth-time*.002*depth)%w+w)%w,yy=((seed(i,8)*h-camera.y*.02*depth+time*.0006*depth)%h+h)%h;
   const bright=.42+Math.sin(time/1800+i*4)*.18;ctx.globalAlpha=bright;ctx.fillStyle=i%9===0?'#c3b993':i%7===0?'#8bb7c5':'#b7c9d1';ctx.fillRect(Math.floor(xx),Math.floor(yy),i%13===0?2:1,i%13===0?2:1);if(i%53===0){ctx.globalAlpha=.18;ctx.fillRect(Math.floor(xx)-2,Math.floor(yy),5,1);ctx.fillRect(Math.floor(xx),Math.floor(yy)-2,1,5);}}
  ctx.globalAlpha=1;
 }
 function depth(r){
  const x=r.x,y=r.y,w=r.w,h=r.h;
  // A cutaway slab: top stays at the original floor coordinates, extrusion extends below it.
  poly([[x+4,y+8],[x+w+27,y+3],[x+w+43,y+h+37],[x+24,y+h+44]],'#01060bb0');
  poly([[x-7,y+h-2],[x+w+7,y+h-2],[x+w+7,y+h+28],[x-7,y+h+28]],'#263c49');
  poly([[x+w+7,y-8],[x+w+23,y-24],[x+w+23,y+h+12],[x+w+7,y+h+28]],'#142a39');
  ctx.fillStyle='#8b9a98';ctx.fillRect(x-7,y+h-1,w+14,4);ctx.fillStyle='#101f2b';ctx.fillRect(x-7,y+h+23,w+14,6);
  for(let xx=x+5;xx<x+w-12;xx+=38){ctx.fillStyle='#142631';ctx.fillRect(xx,y+h+7,25,11);ctx.fillStyle='#536872';ctx.fillRect(xx,y+h+7,25,2);ctx.fillStyle='#9cab9a';ctx.fillRect(xx+3,y+h+10,2,2);ctx.fillRect(xx+20,y+h+10,2,2);}
  for(let yy=y+25;yy<y+h;yy+=43)poly([[x+w+10,yy],[x+w+20,yy-10],[x+w+20,yy-4],[x+w+10,yy+6]],'#3c535f');
 }
 function rearWall(r){
  const {x,y,w,h}=r;
  // Raised rear bulkhead, with a lit roof plane and inset service panels.
  poly([[x-7,y-8],[x+8,y-29],[x+w+23,y-29],[x+w+7,y-8]],'#81908e');
  ctx.fillStyle='#3e5663';ctx.fillRect(x-7,y-8,w+14,11);ctx.fillStyle='#b9c3af';ctx.fillRect(x+8,y-29,w+15,2);
  for(let xx=x+15;xx<x+w-22;xx+=55){poly([[xx,y-12],[xx+6,y-21],[xx+36,y-21],[xx+30,y-12]],'#263d49');ctx.fillStyle='#647b82';ctx.fillRect(xx+5,y-9,24,2);}
  ctx.fillStyle='#102431';ctx.fillRect(x-7,y+3,7,h-3);ctx.fillStyle='#697e83';ctx.fillRect(x-7,y+3,2,h-3);
  for(const xx of [x-8,x+w-4]){poly([[xx,y+2],[xx+8,y-9],[xx+16,y-9],[xx+8,y+2]],'#a2afa6');ctx.fillStyle='#415b68';ctx.fillRect(xx,y+2,8,30);ctx.fillStyle='#b5b79b';ctx.fillRect(xx+1,y+3,2,27);}
 }
 function foreground(r){
  // Low safety rail stays below workstations; no change to camera hit testing.
  const {x,y,w,h}=r,yy=y+h+2;
  ctx.fillStyle='#030a1260';ctx.fillRect(x+15,yy+9,w-22,4);
  for(let xx=x+12;xx<x+w-10;xx+=62){ctx.fillStyle='#172d3c';ctx.fillRect(xx+3,yy-6,5,16);ctx.fillStyle='#91a39a';ctx.fillRect(xx,yy-8,4,15);ctx.fillStyle='#d3c18a';ctx.fillRect(xx,yy-9,5,3);}
  ctx.fillStyle='#283f4d';ctx.fillRect(x+12,yy-7,w-22,4);ctx.fillStyle='#9daa9c';ctx.fillRect(x+12,yy-8,w-22,1);
 }
 function roomLight(r,powered){
  // Stepped pools of light keep the hard pixel edges of the station art.
  ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
  for(const x of [r.x+22,r.x+r.w-28]){
   ctx.fillStyle='#030910';ctx.fillRect(x-5,r.y+32,15,8);
   ctx.fillStyle=powered?'#dfcf9c':'#655e49';ctx.fillRect(x-3,r.y+34,11,3);
   if(powered)for(let i=0;i<5;i++){ctx.fillStyle=`rgba(222,190,115,${.033-i*.005})`;ctx.fillRect(x-10-i*5,r.y+39+i*8,25+i*10,8);}
  }
  ctx.restore();
 }
 function catwalk(x,y,w,h,vertical=false){
  ctx.fillStyle='#02070bb3';ctx.fillRect(x+10,y+16,w+3,h);
  ctx.fillStyle='#1c3240';ctx.fillRect(x,y+h,w,12);ctx.fillStyle='#52707b';ctx.fillRect(x,y+h,w,2);
  ctx.fillStyle='#56676a';ctx.fillRect(x,y,w,h);ctx.fillStyle='#192b34';ctx.fillRect(x+3,y+3,w-6,h-6);
  ctx.fillStyle='#374952';
  if(vertical){for(let yy=y+5;yy<y+h-4;yy+=7)ctx.fillRect(x+7,yy,w-14,2);}
  else{for(let xx=x+5;xx<x+w-4;xx+=7)ctx.fillRect(xx,y+7,2,h-14);}
  ctx.fillStyle='#84918b';if(vertical)ctx.fillRect(x,y,2,h);else ctx.fillRect(x,y,w,2);
  ctx.fillStyle='#b9a16b';if(vertical){for(let yy=y+12;yy<y+h;yy+=30){ctx.fillRect(x+3,yy,3,8);ctx.fillRect(x+w-6,yy,3,8);}}
  else{for(let xx=x+12;xx<x+w;xx+=30){ctx.fillRect(xx,y+3,8,3);ctx.fillRect(xx,y+h-6,8,3);}}
  const post=(xx,yy)=>{ctx.fillStyle='#0b1a23';ctx.fillRect(xx+3,yy+5,5,10);ctx.fillStyle='#a5b6ab';ctx.fillRect(xx,yy-7,3,13);ctx.fillStyle='#d1b778';ctx.fillRect(xx-1,yy-8,5,3);};
  if(vertical){for(let yy=y+16;yy<y+h-10;yy+=35){post(x,yy);post(x+w-3,yy);}ctx.fillStyle='#a7b8ac';ctx.fillRect(x,y,2,h);ctx.fillRect(x+w-3,y,2,h);}
  else{for(let xx=x+16;xx<x+w-10;xx+=35){post(xx,y);post(xx,y+h-3);}ctx.fillStyle='#a7b8ac';ctx.fillRect(x,y-7,w,2);ctx.fillRect(x,y+h-10,w,2);}
 }
 return {floor,space,depth,rearWall,foreground,roomLight,catwalk};
}
