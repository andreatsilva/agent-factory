// Original binary portrait: analytic facial relief rendered entirely with 0/1 glyphs.
export function createBinaryFace(){
 const canvas=document.createElement('canvas');canvas.width=516;canvas.height=480;
 const c=canvas.getContext('2d'),cols=86,rows=60;
 const gauss=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);
 let last=-1;
 function draw(time,state='ready'){
  const frame=Math.floor(time/110);if(frame===last?.frame&&state===last.state)return canvas;last={frame,state};
  const paused=state==='paused'||state==='offline',t=paused?0:time/1000,turn=Math.sin(t*.33)*.035,blink=!paused&&t%5.8>5.62,mouth=state==='reply'?(Math.sin(t*15)+1)*.024:0;
  c.fillStyle='#010603';c.fillRect(0,0,516,480);c.font='8px monospace';c.textBaseline='top';
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const u=(col-cols/2)/(cols/2),v=(row-rows*.43)/(rows*.48),x=u-turn,y=v;
   const head=x*x/(.43*.43)+(y+.07)*(y+.07)/(.72*.72);
   let brightness=.055+((col*17+row*31)%11)*.004;
   if(head<1){
    const z=Math.sqrt(1-head);brightness=.13+.36*z+Math.max(0,-x)*.56;
    // Forehead, temples, cheekbones, orbital sockets and a projecting bridge.
    brightness+=.17*gauss(x,y,-.13,-.4,.26,.22);
    brightness-=.35*(gauss(x,y,-.17,-.17,.105,.08)+gauss(x,y,.17,-.17,.105,.08));
    brightness+=.25*gauss(x,y,-.06,.035,.065,.23)-.22*gauss(x,y,.065,.10,.045,.15);
    brightness+=.16*(gauss(x,y,-.25,.12,.1,.12)+gauss(x,y,.25,.12,.1,.12));
    brightness-=.21*(gauss(x,y,-.31,.28,.08,.18)+gauss(x,y,.31,.28,.08,.18));
    brightness-=.27*gauss(x,y,0,.39,.16,.022+mouth);
    brightness+=.17*gauss(x,y,-.025,.44,.13,.033)+.16*gauss(x,y,0,.53,.16,.08);
    brightness-=.23*(gauss(x,y,-.075,.22,.035,.022)+gauss(x,y,.075,.22,.035,.022));
    for(const eye of [-.17,.17]){
     brightness-=.24*gauss(x,y,eye,-.255,.12,.027);
     brightness+=(blink?.02:.46)*gauss(x,y,eye,-.16,.075,blink?.009:.021);
     if(!blink)brightness-=.22*gauss(x,y,eye+turn,-.16,.015,.025);
    }
   }else if(y>.55&&y<1.18&&Math.abs(x)<.20+(y-.55)*.8){
    brightness=.13+.18*(1-Math.abs(x))+.10*Math.max(0,-x);
    if(y>.76)brightness-=.07;
   }
   // Occasional bright code falls behind the face, never over facial features.
   if(head>=1&&Math.abs(((row+col*11-Math.floor(t*5))%67+67)%67)<2)brightness+=.07;
   brightness=Math.max(.025,Math.min(.95,brightness*1.4))*(paused?.48:1);
   c.fillStyle=`rgb(${Math.round(brightness*104)},${Math.round(brightness*255)},${Math.round(brightness*128)})`;
   const bit=((col*13+row*7+Math.floor(t*(state==='thinking'?6:2))+(col*row)%19)%7)<3?'1':'0';
   c.fillText(bit,col*6,row*8);
  }
  return canvas;
 }
 return {canvas,draw};
}

export function createNeoConsole(){
 const face=createBinaryFace(),panel=document.getElementById('neoConsole'),portrait=document.getElementById('neoPortrait'),pctx=portrait.getContext('2d'),form=document.getElementById('neoChatForm'),input=document.getElementById('neoMessage'),send=document.getElementById('neoSend'),status=document.getElementById('neoLinkState'),error=document.getElementById('neoChatError'),history=document.getElementById('neoHistory');
 let live={online:false,running:false,ready:false,busy:false},pending=false,replyUntil=0,clock=0,lastTime=performance.now(),lastPoll=0,loading=false,origin=null,turns=[];
 const mode=()=>!live.online?'offline':!live.running?'paused':pending?'thinking':clock<replyUntil?'reply':live.busy?'busy':'ready';
 function refresh(){
  status.textContent=!live.online?'LINK OFFLINE':!live.running?'GAMING MODE · NEO PAUSED':pending?'NEO IS THINKING…':!live.ready?'OLLAMA UNAVAILABLE':live.busy?'NEO IS WORKING':'NEO IS LISTENING';
  send.disabled=pending||!live.online||!live.running||!live.ready||live.busy||!input.value.trim();
  input.disabled=!live.online||!live.running;
  document.getElementById('neoMessageCount').textContent=input.value.length+' / 2000';
 }
 function renderHistory(){
  const atBottom=history.scrollHeight-history.scrollTop-history.clientHeight<70;history.replaceChildren();
  if(!turns.length){const p=document.createElement('p');p.className='neoWelcome';p.textContent='DIRECT LINK ESTABLISHED\nTalk to NEO about the factory, product ideas or your next move. Replies come from your local model. Conversation is saved on this PC.';history.append(p);}
  for(const turn of turns){
   const add=(label,body,kind)=>{const article=document.createElement('article');article.className='neoMessage '+kind;const heading=document.createElement('b');heading.textContent=label;const text=document.createElement('p');text.textContent=body;article.append(heading,text);history.append(article);};
   add('YOU',turn.message,'operator');
   if(turn.status==='complete')add('NEO',turn.response,'answer');
   else if(turn.status==='failed')add('TRANSMISSION INTERRUPTED',turn.error||'Please send again.','failure');
   else add('NEO','Thinking on the local model…','waiting');
  }
  if(atBottom)history.scrollTop=history.scrollHeight;
 }
 async function request(url,options){const response=await fetch(url,options),data=await response.json();if(!response.ok)throw Error(data.error||'Connection failed');return data;}
 async function load(){if(loading)return;loading=true;try{const data=await request('/api/neo/chat');if(JSON.stringify(turns)!==JSON.stringify(data.turns)){turns=data.turns;renderHistory();}document.getElementById('neoModelName').textContent=data.model;}catch(e){error.textContent=e.message;}finally{loading=false;}}
 function open(){origin=document.activeElement;panel.hidden=false;refresh();load();input.focus();}
 function close(){panel.hidden=true;origin?.focus();}
 document.getElementById('talkNeo').onclick=open;document.getElementById('closeNeo').onclick=close;
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 input.addEventListener('input',refresh);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!send.disabled)form.requestSubmit();}});
 document.querySelectorAll('[data-neo-prompt]').forEach(b=>b.onclick=()=>{input.value=b.dataset.neoPrompt;refresh();input.focus();});
 form.onsubmit=async e=>{
  e.preventDefault();if(send.disabled)return;
  const message=input.value.trim(),id=crypto.randomUUID();pending=true;error.textContent='';input.value='';refresh();
  turns.push({id,message,status:'pending'});renderHistory();history.scrollTop=history.scrollHeight;
  try{await request('/api/neo/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,message})});replyUntil=clock+2200;}
  catch(e){error.textContent=e.message;if(!input.value)input.value=message;}
  finally{pending=false;await load();refresh();if(!panel.hidden)input.focus();}
 };
 function tick(){const now=performance.now();if(live.running&&live.online&&!document.hidden)clock+=Math.min(200,now-lastTime);lastTime=now;
  if(!panel.hidden&&!document.hidden){pctx.drawImage(face.draw(matchMedia('(prefers-reduced-motion: reduce)').matches?0:clock,mode()),0,0);if(now-lastPoll>4000){lastPoll=now;load();}refresh();}
 }
 renderHistory();setInterval(tick,120);
 return {open,setStatus(state){live=state;refresh();},drawFace(ctx,x,y,w,h,time){ctx.drawImage(face.draw(matchMedia('(prefers-reduced-motion: reduce)').matches?0:time,mode()),x,y,w,h);}};
}
