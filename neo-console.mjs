import {createBinaryFace} from './neo-face.mjs';
import {createNeoAvatar} from './neo-avatar.mjs';
export {createBinaryFace} from './neo-face.mjs';
export function createNeoConsole(){
 const face=createBinaryFace(),avatar=createNeoAvatar(),panel=document.getElementById('neoConsole'),portrait=document.getElementById('neoPortrait'),pctx=portrait.getContext('2d'),form=document.getElementById('neoChatForm'),input=document.getElementById('neoMessage'),send=document.getElementById('neoSend'),status=document.getElementById('neoLinkState'),error=document.getElementById('neoChatError'),history=document.getElementById('neoHistory');
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
  if(!panel.hidden&&!document.hidden){avatar.portrait(pctx,portrait.width,portrait.height,clock,mode());if(now-lastPoll>4000){lastPoll=now;load();}refresh();}
 }
 renderHistory();setInterval(tick,120);
 return {open,setStatus(state){live=state;refresh();},drawFace(ctx,x,y,w,h,time){ctx.drawImage(face.draw(matchMedia('(prefers-reduced-motion: reduce)').matches?0:time,mode()),x,y,w,h);}};
}
