import {createMarketplaceConsole} from './marketplace-console.mjs';
import {createOperatorClient} from './operator-client.mjs';
const $=id=>document.getElementById(id),el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
// Pages cannot set a frame-ancestors response header. Keep login hidden until this check.
if(window.self!==window.top){document.body.replaceChildren(el('p','Open the operator page directly to sign in.'));document.body.hidden=false;throw Error('Operator login cannot run in a frame');}
document.body.hidden=false;
let signedIn=false,state=null,loading=false,acting=false,expiryTimer=null,generation=0,revoking=false;
const client=createOperatorClient({onExpired:()=>lock('Your session expired. Sign in again.')});
const marketplaces=createMarketplaceConsole({read:()=>client.marketplaces(),act:body=>client.action('marketplace',body),download:id=>client.marketplaceExport(id)});
$('fiverrWing').onclick=()=>marketplaces.open('fiverr');$('etsyWing').onclick=()=>marketplaces.open('etsy');
function message(text,error=false){$('operatorMessage').textContent=text;$('operatorMessage').className=error?'error':'';}
function lock(reason=''){
 marketplaces.close(true);
 clearEnrollment();$('mfaRecovery').hidden=true;$('recoveryCodes').textContent='';$('mfaMessage').textContent='';$('mfaStatus').textContent='Checking MFA status…';$('mfaSetupForm').hidden=true;$('loginForm').hidden=false;$('factorForm').hidden=true;$('factorCode').value='';
 signedIn=false;state=null;loading=false;acting=false;generation++;clearTimeout(expiryTimer);$('operatorPanel').hidden=true;$('loginPanel').hidden=false;$('factoryFloor').removeAttribute('src');$('authState').textContent='SECURE OPERATOR ACCESS';document.title='Operator Login | NEO Factory';window.scrollTo({top:0});
 for(const id of ['jobs','crewList','bayList','productRows','sources','sessionInfo','operatorMessage','productionState','layoutState','runState','aiState','crewState','productState'])$(id).replaceChildren();
 for(const form of [$('configForm'),$('crewForm'),$('layoutForm')]){form.reset();form.classList.remove('dirty');} $('department').replaceChildren();$('loginError').textContent=reason;$('password').value='';
}
function disableActions(){for(const b of $('operatorPanel').querySelectorAll('.command-buttons button,.management-grid form button,#bayList button,.crew-actions button'))b.disabled=acting||loading||!state;for(const input of $('crewForm').elements)input.disabled=acting||loading||!state||!!state.crew.automatic;$('rebalanceCrew').disabled=acting||loading||!state||!state.crew.automatic||!state.running;const start=$('operatorPanel').querySelector('[data-action="start"]'),stop=$('operatorPanel').querySelector('[data-action="stop"]');if(state&&!acting&&!loading){start.disabled=state.running||state.stopping;stop.disabled=!state.running||state.stopping;}}
function render(){
 if(!signedIn||!state)return;
 $('runState').textContent=state.stopping?'STOPPING':state.running?'● FACTORY RUNNING':'■ GAMING MODE / PAUSED';$('aiState').textContent='OLLAMA '+(state.ai.reachable?(state.ai.busy?'BUSY':'ONLINE'):'OFFLINE');$('crewState').textContent=state.crew.active+' / '+state.crew.limit+' AGENTS';$('productState').textContent=state.counts.products+' PRODUCTS';
 $('productionState').textContent=state.mode+' · '+(state.production.state||'IDLE').replaceAll('_',' ')+' · '+state.production.active+'/'+state.config.maxConcurrentJobs+' lanes occupied · '+state.counts.queued+' queued';
 const config=$('configForm');if(!config.classList.contains('dirty')){for(const k of ['continuousProduction','maxConcurrentJobs','maxAgents','dailyBudget','hourlyAIBudget'])config.elements[k].value=state.config[k];config.elements.researchMinutes.value=state.config.researchIntervalMs/60000;config.elements.discountPercent.value=Math.round(state.config.priceDiscount*100);}
 $('jobs').replaceChildren(...(state.production.jobs||[]).map(j=>{const p=el('p',(j.stage||'QUEUED')+' · '+(j.message||j.id));p.className='job-line';return p;}));
 $('automaticCrew').textContent='AUTOMATIC ALLOCATION: '+(state.crew.automatic?'ON':'OFF');$('automaticCrew').setAttribute('aria-pressed',String(!!state.crew.automatic));$('crewAllocation').textContent=state.crew.total+' saved · '+state.crew.active+' deployed · '+(state.crew.reserve??0)+' reserve · '+(state.crew.busy??0)+' on jobs. '+(state.crew.automatic?(state.crew.allocation?.reason||''): 'Manual allocation.');
 $('crewList').replaceChildren(...state.crew.departments.map(d=>{const row=el('div');row.className='crew-row';row.append(el('span',d.name),el('span',d.active+' deployed / '+d.busy+' on jobs / '+(d.reserve??0)+' reserve'));return row;}));
 const chosen=$('department').value;$('department').replaceChildren(...state.crew.departments.map(d=>{const o=el('option',d.name);o.value=d.id;return o;}));if(chosen)$('department').value=chosen;if(!$('crewForm').classList.contains('dirty'))$('crewTarget').value=state.crew.departments.find(d=>d.id===$('department').value)?.active||0;
 $('layoutState').textContent=state.layout.bays.length+' expansion bays · revision '+state.layout.revision;
 $('bayList').replaceChildren(...state.layout.bays.map(b=>{const row=el('div');row.className='bay-row';row.append(el('span',b.side.toUpperCase()+' '+(b.index+1)+' / '+(b.moduleId||b.crewDepartment||b.type)));if(!b.moduleId&&!b.crewDepartment&&!state.layout.bays.some(other=>other.side===b.side&&other.index>b.index)){const button=el('button','REMOVE EMPTY BAY');button.type='button';button.addEventListener('click',()=>mutate('layout',{action:'remove',id:b.id,revision:state.layout.revision}));row.append(button);}return row;}));
 $('sources').replaceChildren(...state.sources.map(s=>el('p',s.provider+' · '+s.status+(s.error?' · '+s.error:' · '+(s.created||0)+' opportunities'))));
 $('productRows').replaceChildren(...state.products.map(p=>{const row=el('tr');for(const value of [p.title,p.status,Number.isFinite(p.priceCents)?'€'+(p.priceCents/100).toFixed(2):'—',Number.isFinite(p.qualityScore)?p.qualityScore+'/100':'—'])row.append(el('td',value));return row;}));disableActions();
}
async function refresh(force=false){
 if(!signedIn||loading||acting&&!force)return;const turn=generation;loading=true;$('refreshState').disabled=true;disableActions();
 try{const value=await client.state();if(!signedIn||turn!==generation)return;state=value;render();$('authState').textContent='AUTHENTICATED / LIVE';if($('operatorPanel').hasAttribute('data-offline'))message('Factory connection restored.');$('operatorPanel').removeAttribute('data-offline');}
 catch(e){if(signedIn&&turn===generation){state=null;disableActions();$('authState').textContent='AUTHENTICATED / CONNECTION LOST';$('operatorPanel').setAttribute('data-offline','');message(e.message+' Displayed data may be out of date; refresh before sending actions.',true);}}
 finally{if(turn===generation){loading=false;$('refreshState').disabled=false;disableActions();}}
}
async function mutate(action,payload={},form){
 if(!signedIn||acting||loading||!state)return;acting=true;disableActions();const turn=generation;message('Sending '+action+' to the factory…');
 try{const out=await client.action(action,payload);if(!signedIn||turn!==generation)return;form?.classList.remove('dirty');message(out.message);}
 catch(e){if(signedIn&&turn===generation)message(e.message+' Check the current factory state before retrying.',true);}
 finally{if(signedIn&&turn===generation){acting=false;await refresh(true);disableActions();}}
}
function sessionInfo(session){clearTimeout(expiryTimer);$('sessionInfo').textContent=session.username+' · session expires '+new Date(session.expiresAt).toLocaleTimeString();expiryTimer=setTimeout(()=>{client.clear();lock('Session expired after one hour. Sign in again.');},Math.max(0,session.expiresAt-Date.now()));}
async function openSession(session){signedIn=true;generation++;$('loginPanel').hidden=true;$('operatorPanel').hidden=false;window.scrollTo({top:0});document.title='Operator Control | NEO Factory';sessionInfo(session);$('factoryFloor').src='./index.html?embedded=1';await Promise.all([refresh(),refreshSecurity()]);}
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(revoking)return;$('signIn').disabled=true;$('loginError').textContent='Verifying your operator login…';
 const username=$('username').value,password=$('password').value;$('password').value='';
 try{const session=await client.login(username,password);if(session.mfaRequired){$('loginForm').hidden=true;$('factorForm').hidden=false;$('loginError').textContent='Second factor required. Factory controls remain locked.';$('factorCode').focus();}else await openSession(session);}
 catch(e){$('loginError').textContent=e.message;}finally{$('signIn').disabled=false;}
});
$('factorForm').addEventListener('submit',async event=>{event.preventDefault();$('verifyFactor').disabled=true;const code=$('factorCode').value.trim();$('factorCode').value='';try{await openSession(await client.verify(code));}catch(e){$('loginError').textContent=e.message;}finally{$('verifyFactor').disabled=false;}});
$('backToPassword').addEventListener('click',()=>{client.clear();lock();$('password').focus();});
let setupTimer=null;
function clearEnrollment(){clearTimeout(setupTimer);$('mfaEnrollment').hidden=true;$('mfaSecret').textContent='';$('mfaQr').width=0;$('setupPassword').value='';$('enrollmentCode').value='';}
async function refreshSecurity(){const turn=generation;try{const security=await client.security();if(!signedIn||turn!==generation)return;$('mfaStatus').textContent=security.enabled?'MFA ACTIVE · '+security.recoveryCodesRemaining+' recovery codes remaining':'MFA NOT ACTIVE · Complete setup to protect your operator login.';$('mfaSetupForm').hidden=security.enabled||!security.available||!$('mfaEnrollment').hidden;if(!security.available)$('mfaStatus').textContent='MFA setup unavailable. Check the PC gateway.';}catch(e){if(signedIn&&turn===generation)$('mfaStatus').textContent=e.message;}}
async function securityAction(form,action){const turn=generation;for(const b of form.querySelectorAll('button'))b.disabled=true;$('mfaMessage').textContent='';try{await action(turn);}catch(e){if(signedIn&&turn===generation)$('mfaMessage').textContent=e.message;}finally{for(const b of form.querySelectorAll('button'))b.disabled=false;}}
$('mfaSetupForm').addEventListener('submit',event=>{event.preventDefault();const password=$('setupPassword').value;$('setupPassword').value='';void securityAction(event.currentTarget,async turn=>{const setup=await client.beginEnrollment(password);if(!signedIn||turn!==generation)return;clearEnrollment();$('mfaSetupForm').hidden=true;$('mfaEnrollment').hidden=false;$('mfaSecret').textContent=setup.secret;const {size,data}=setup.qr,canvas=$('mfaQr'),scale=5,margin=4;canvas.width=canvas.height=(size+margin*2)*scale;const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#000';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(data[y*size+x])context.fillRect((x+margin)*scale,(y+margin)*scale,scale,scale);setupTimer=setTimeout(()=>{clearEnrollment();$('mfaMessage').textContent='Setup expired. Start again to create a new key.';void refreshSecurity();},Math.max(0,setup.expiresAt-Date.now()));$('enrollmentCode').focus();});});
$('mfaConfirmForm').addEventListener('submit',event=>{event.preventDefault();const code=$('enrollmentCode').value;$('enrollmentCode').value='';void securityAction(event.currentTarget,async turn=>{const session=await client.confirmEnrollment(code);if(!signedIn||turn!==generation)return;clearEnrollment();sessionInfo(session);$('recoveryCodes').textContent=session.recoveryCodes.join('\n');$('mfaRecovery').hidden=false;await refreshSecurity();});});
$('cancelEnrollment').addEventListener('click',()=>{clearEnrollment();void securityAction($('mfaSetupForm'),async()=>{await client.cancelEnrollment();await refreshSecurity();});});
$('savedRecovery').addEventListener('click',()=>{$('recoveryCodes').textContent='';$('mfaRecovery').hidden=true;$('mfaMessage').textContent='Authenticator protection is active. Keep your recovery codes private.';});
async function logout(all){
 if(revoking)return;revoking=true;$('signIn').disabled=true;const result=client.logout(all);lock('Signing out…');
 try{await result;$('loginError').textContent=all?'All operator sessions revoked.':'Signed out.';}catch{$('loginError').textContent='Signed out in this tab. Server revocation could not be confirmed; the session expires within one hour.';}finally{revoking=false;$('signIn').disabled=false;}
}
$('logout').addEventListener('click',()=>logout(false));$('logoutAll').addEventListener('click',()=>logout(true));$('refreshState').addEventListener('click',()=>refresh());
$('operatorPanel').querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>mutate(b.dataset.action)));
for(const id of ['configForm','crewForm','layoutForm'])$(id).addEventListener('input',()=>$(id).classList.add('dirty'));
$('configForm').addEventListener('submit',event=>{event.preventDefault();const v=Object.fromEntries(new FormData(event.currentTarget));void mutate('config',{continuousProduction:Number(v.continuousProduction),maxConcurrentJobs:Number(v.maxConcurrentJobs),maxAgents:Number(v.maxAgents),dailyBudget:Number(v.dailyBudget),hourlyAIBudget:Number(v.hourlyAIBudget),researchIntervalMs:Number(v.researchMinutes)*60000,priceDiscount:Number(v.discountPercent)/100},event.currentTarget);});
$('department').addEventListener('change',()=>{if(state)$('crewTarget').value=state.crew.departments.find(d=>d.id===$('department').value)?.active||0;});
$('automaticCrew').addEventListener('click',()=>mutate('crew',{action:'automatic',automatic:!state.crew.automatic}));
$('rebalanceCrew').addEventListener('click',()=>mutate('crew',{action:'rebalance'}));
$('crewForm').addEventListener('submit',event=>{event.preventDefault();void mutate('crew',{department:$('department').value,target:Number($('crewTarget').value)},event.currentTarget);});
$('layoutForm').addEventListener('submit',event=>{event.preventDefault();if(!state)return;const v=Object.fromEntries(new FormData(event.currentTarget));void mutate('layout',{action:'add',side:v.side,type:v.type,revision:state.layout.revision},event.currentTarget);});
setInterval(()=>{if(!document.hidden)void refresh();},15000);
window.addEventListener('pagehide',()=>{client.clear();lock();});
lock();
