// The sprite is original project artwork; cables, light pulses and suspension are animated here.
let sprite;
export function createNeoAvatar(onLoad=()=>{}){
 if(!sprite){sprite=new Image();sprite.src=new URL('./assets/neo-suspended-v1.png',import.meta.url).href;}
 sprite.addEventListener('load',onLoad,{once:true});
 function draw(ctx,x,y,time=0,{powered=true,scale=1}={}){
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t=powered&&!reduced?time/1000:0,bob=Math.sin(t*1.6)*3;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  const ellipse=(y,rx,ry,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,y,rx,ry,0,0,Math.PI*2);ctx.fill();};
  ellipse(12,42-bob,10-bob*.2,'#020807b0');ellipse(9,31,7,powered?'#6edea41a':'#52696115');
  const cable=(a,b,phase)=>{
   const points=[];for(let i=0;i<=28;i++){const u=i/28;points.push([a[0]+(b[0]-a[0])*u+Math.sin(u*Math.PI)*Math.sin(t*.7+phase)*3,a[1]+(b[1]-a[1])*u+Math.sin(u*Math.PI)*22]);}
   for(const [width,color,dy] of [[7,'#071111',2],[5,'#435b52',0],[2,'#819984',-1]]){ctx.beginPath();points.forEach(([xx,yy],i)=>{const px=Math.round(xx/2)*2,py=Math.round(yy/2)*2+dy;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();}
   if(powered){const p=points[Math.floor((t*.35+phase)%1*28)];rect(p[0]-2,p[1]-2,4,3,'#b5f6ae');}
  };
  // Rear neck and spine feeds, then forearm umbilicals. Endpoints track the floating body.
  cable([-59,-143],[8,-137+bob],.2);cable([58,-143],[13,-130+bob],.7);
  cable([-91,-1],[-27,-68+bob],.4);cable([91,-1],[32,-68+bob],.9);
  cable([-79,18],[-14,-49+bob],.1);cable([79,18],[18,-49+bob],.6);
  for(const side of [-1,1]){
   rect(side*88-6,-5,12,18,'#142a2c');rect(side*88-6,-7,12,4,'#85948a');rect(side*88-3,-3,6,3,powered?'#b8e7a0':'#6e7970');
  }
  if(sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,-56,-158+bob,112,168);
  if(powered)for(let i=0;i<5;i++){const yy=5-((t*11+i*28)%160);rect((i%2?1:-1)*(45+(i*7)%14),yy,1,3,'#8de6b677');}
  ctx.restore();
 }
 function portrait(ctx,w,h,time,state='ready'){
  ctx.fillStyle='#030b08';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#173a2b';ctx.lineWidth=1;
  for(let x=12;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=12;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  const scale=Math.min(w/210,h/202);draw(ctx,w/2,h*.87,time,{scale,powered:!['paused','offline'].includes(state)});
 }
 return {draw,portrait};
}
