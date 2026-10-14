import {createNeoAvatar} from './neo-avatar.mjs';
import {sendPublicMessage} from './viewer-client.mjs';
export function createPublicNeoConsole({feedUrl}){
 const byId=id=>document.getElementById(id),panel=byId('neoConsole'),input=byId('neoMessage'),form=byId('neoChatForm'),send=byId('neoSend'),history=byId('neoHistory'),status=byId('neoLinkState'),error=byId('neoChatError'),portrait=byId('neoPortrait'),ctx=portrait.getContext('2d'),avatar=createNeoAvatar();
 let live={online:false,running:false},pending=false,origin=null,turns=[],replyUntil=0;
 const mode=()=>!live.online?'offline':!live.running?'paused':pending?'thinking':performance.now()<replyUntil?'reply':'ready';
 byId('neoConsoleTitle').textContent='NEO // VISITOR LINK';byId('neoModelName').textContent='LOCAL AI · PUBLIC CHANNEL';
 panel.querySelector('.neoIdentity p:last-child').textContent='Chat only · no factory controls. Messages go to the owner’s PC for a reply; conversation stays in this tab and is not saved by the server.';
 input.maxLength=600;input.placeholder='Say hello or ask about the factory…';
 const prompts=[['FACTORY STATUS','What is happening in the factory right now?'],['HOW IT WORKS','How does this factory work?'],['MEET NEO','Introduce yourself, NEO.']];
 panel.querySelectorAll('[data-neo-prompt]').forEach((b,i)=>{b.textContent=prompts[i][0];b.onclick=()=>{input.value=prompts[i][1];refresh();input.focus();};});
 function refresh(){
  status.textContent=!feedUrl?'PUBLIC CHAT NOT CONNECTED':!live.online?'LINK OFFLINE':!live.running?'GAMING MODE · NEO PAUSED':pending?'NEO IS THINKING…':'VISITOR CHANNEL · CHAT ONLY';
  send.disabled=pending||!live.online||!live.running||!input.value.trim();input.disabled=pending||!live.online||!live.running;
  byId('neoMessageCount').textContent=input.value.length+' / 600';
 }
 function render(){
  history.replaceChildren();
  if(!turns.length){const p=document.createElement('p');p.className='neoWelcome';p.textContent='WELCOME TO THE OBSERVATION DECK\nI’m NEO. Ask me about the factory or just say hello. I can see public activity and counts. This visitor link cannot run jobs, change settings or access private conversations.\n\nPlease keep personal information out of public chat.';history.append(p);}
  const add=(label,body,kind)=>{const a=document.createElement('article'),h=document.createElement('b'),p=document.createElement('p');a.className='neoMessage '+kind;h.textContent=label;p.textContent=body;a.append(h,p);history.append(a);};
  for(const t of turns){add('YOU',t.message,'operator');add(t.error?'LINK STATUS':'NEO',t.error||t.reply||'Thinking on the local model…',t.error?'failure':'answer');}
  history.scrollTop=history.scrollHeight;
 }
 function close(){panel.hidden=true;origin?.focus();}
 function open(){origin=document.activeElement;panel.hidden=false;refresh();(input.disabled?byId('closeNeo'):input).focus();}
 byId('publicTalkNeo').onclick=open;byId('closeNeo').onclick=close;
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){const els=[...panel.querySelectorAll('button,textarea')].filter(e=>!e.disabled),first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 input.addEventListener('input',refresh);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!send.disabled)form.requestSubmit();}});
 form.onsubmit=async e=>{
  e.preventDefault();if(send.disabled)return;
  const recent=turns.filter(t=>t.reply).flatMap(t=>[{role:'user',content:t.message},{role:'assistant',content:t.reply}]),turn={message:input.value.trim()};
  turns.push(turn);turns=turns.slice(-20);pending=true;input.value='';error.textContent='';refresh();render();
  try{turn.reply=await sendPublicMessage(feedUrl,turn.message,recent);replyUntil=performance.now()+2400;}
  catch(e){turn.error=e.name==='TimeoutError'?'NEO took too long to reply. Please try again.':e.message;error.textContent=turn.error;input.value=turn.message;}
  finally{pending=false;render();refresh();if(!panel.hidden&&!input.disabled)input.focus();}
 };
 setInterval(()=>{if(!panel.hidden&&!document.hidden)avatar.portrait(ctx,portrait.width,portrait.height,performance.now(),mode());},100);
 render();refresh();
 return {open,setStatus(state){live=state;refresh();}};
}
