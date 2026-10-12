// Atlas bounds come from alpha, so exporter padding cannot cut off helmets or boots.
export function atlasFrames(pixels,width,height){
 const runs=(counts,minSize)=>{const groups=[];let start=-1,last=-1;for(let i=0;i<counts.length;i++){if(counts[i]>3){if(start<0)start=i;last=i;}else if(start>=0&&i-last>12){if(last-start+1>=minSize)groups.push([start,last+1]);start=-1;}}if(start>=0&&last-start+1>=minSize)groups.push([start,last+1]);return groups;};
 const rows=new Uint32Array(height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>64)rows[y]++;
 const bands=runs(rows,height*.08);if(bands.length!==4)throw Error('Worker atlas must contain four separate animation rows');
 return bands.map(([top,bottom])=>{const columns=new Uint32Array(width);for(let x=0;x<width;x++)for(let y=top;y<bottom;y++)if(pixels[(y*width+x)*4+3]>64)columns[x]++;
  const cells=runs(columns,width*.035);if(cells.length!==4)throw Error('Worker atlas must contain four characters per row');
  return cells.map(([left,right])=>{let minY=bottom,maxY=top;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(pixels[(y*width+x)*4+3]>64){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
   return {x:Math.max(0,left-2),y:Math.max(0,minY-2),w:Math.min(width,right+2)-Math.max(0,left-2),h:Math.min(height,maxY+3)-Math.max(0,minY-2)};
  });
 });
}
export function createWorkerSprites(ctx,onReady){
 const sheets={};
 async function load(kind,url){const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);sheets[kind]={image,frames:atlasFrames(c.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)};onReady();}
 load('walk','/assets/factory-worker-walk-v1.png').catch(e=>console.warn('Worker walking atlas:',e.message));
 load('work','/assets/factory-worker-work-v1.png').catch(e=>console.warn('Worker work atlas:',e.message));
 return {draw(worker,p,time,working){const sheet=working?sheets.work||sheets.walk:sheets.walk;if(!sheet)return false;
  const row={down:0,left:1,right:2,up:3}[p.facing]??0,col=p.moving?Math.floor(time/145+worker.station_index)%4:working?Math.floor(time/235+worker.station_index)%4:1,frame=sheet.frames[row][col],height=37,width=Math.round(frame.w/frame.h*height);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet.image,frame.x,frame.y,frame.w,frame.h,Math.round(p.x-width/2),Math.round(p.y+13-height),width,height);return true;
 }};
}
