// Camera coordinates are world pixels, independent of CSS size and letterboxing.
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function screenToWorld(p,c,w=1280,h=720){return {x:c.x+(p.x-w/2)/c.zoom,y:c.y+(p.y-h/2)/c.zoom};}
export function worldToScreen(p,c,w=1280,h=720){return {x:(p.x-c.x)*c.zoom+w/2,y:(p.y-c.y)*c.zoom+h/2};}
export function fitCamera(b,w=1280,h=720,padding=70){return {x:b.x+b.w/2,y:b.y+b.h/2,zoom:clamp(Math.min(w/(b.w+padding*2),h/(b.h+padding*2)),.04,4)};}
export function boundCamera(c,b){return {x:clamp(c.x,b.x-150,b.x+b.w+150),y:clamp(c.y,b.y-150,b.y+b.h+150),zoom:clamp(c.zoom,.04,4)};}
export function zoomAt(c,p,factor,b,w=1280,h=720){const before=screenToWorld(p,c,w,h),zoom=clamp(c.zoom*factor,.04,4);return boundCamera({zoom,x:before.x-(p.x-w/2)/zoom,y:before.y-(p.y-h/2)/zoom},b);}
