// Supplied Orbital v2 portrait. The previous floating NEO is no longer rendered.
let sprite;
export function createNeoAvatar(onLoad=()=>{}){
 if(!sprite){sprite=new Image();sprite.src=new URL('./assets/orbital/neo-hologram.png',import.meta.url).href;}
 sprite.addEventListener('load',onLoad,{once:true});
 function draw(ctx,x,y,time=0,{powered=true,scale=1}={}){
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,x-110*scale,y-200*scale,220*scale,203*scale);
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(powered&&!reduced){ctx.globalAlpha=.15;ctx.fillStyle='#91ffb2';ctx.fillRect(x-95*scale,y-185*scale+(time/70%165)*scale,190*scale,2*scale);}
  ctx.restore();
 }
 function portrait(ctx,w,h,time,state='ready'){ctx.fillStyle='#020b08';ctx.fillRect(0,0,w,h);draw(ctx,w/2,h*.92,time,{scale:Math.min(w/255,h/240),powered:!['paused','offline'].includes(state)});}
 return {draw,portrait};
}
