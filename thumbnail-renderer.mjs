// Local deterministic compositor. No network requests, image generation or external assets.
export function renderThumbnails(brief,makeCanvas=()=>document.createElement('canvas')){
 return [0,1].map(variant=>{
  const c=makeCanvas();c.width=1280;c.height=720;const g=c.getContext('2d');
  const accent=brief.accent;g.fillStyle=variant?'#f3eedf':'#111b28';g.fillRect(0,0,1280,720);
  g.save();g.translate(variant?970:1030,350);g.rotate(variant?-.3:.25);g.fillStyle=accent;g.fillRect(-190,-250,380,500);g.fillStyle=variant?'#19364a':'#283f55';g.fillRect(-125,-180,250,360);g.strokeStyle=accent;g.lineWidth=10;g.strokeRect(-90,-140,180,280);g.restore();
  g.fillStyle=accent;g.fillRect(68,64,110,10);g.fillStyle=variant?'#243348':'#dfe8ee';g.font='bold 25px Arial';g.fillText(brief.brand.toUpperCase(),68,118,780);
  const words=brief.headline.split(/\s+/);let size=94,lines;
  do{g.font=`900 ${size}px Arial`;lines=[''];for(const word of words){const at=lines.length-1,next=(lines[at]+' '+word).trim();if(g.measureText(next).width>780&&lines[at])lines.push(word);else lines[at]=next;}if(lines.length<=3&&lines.every(l=>g.measureText(l).width<=780))break;size-=4;}while(size>=42);
  g.fillStyle=variant?'#132e42':'#ffffff';lines.forEach((line,i)=>g.fillText(line,68,270+i*(size+12),780));
  g.fillStyle=variant?'#324657':'#cbd5dd';g.font='26px Arial';const subtitle=brief.subtitle;let sub=[''];for(const w of subtitle.split(/\s+/)){let i=sub.length-1;if(g.measureText((sub[i]+' '+w).trim()).width>790&&sub[i])sub.push(w);else sub[i]=(sub[i]+' '+w).trim();}sub.slice(0,2).forEach((line,i)=>g.fillText(line,68,590+i*34,790));
  g.fillStyle=accent;g.fillRect(68,660,780,5);return c.toDataURL('image/png').split(',')[1];
 });
}
