const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createSalesConsole(){
 const panel=document.getElementById('salesPanel'),body=document.getElementById('salesBody'),status=document.getElementById('salesStatus');let data,selected=null,busy=false;
 async function api(path='',payload){const r=await fetch('/api/sales'+path,payload===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),out=await r.json();if(!r.ok)throw Error(out.error);return out;}
 async function load(){data=await api();render();}
 async function work(fn){if(busy)return;busy=true;status.textContent='Working locally…';body.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();await load();status.textContent='Saved locally. No message sent and no payment recorded.';}catch(e){status.textContent=e.message;}finally{busy=false;body.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 const field=(name,label,value='',max=100)=>`<label>${label}<input name="${name}" value="${esc(value)}" maxlength="${max}"></label>`;
 const briefFields=b=>field('headline','Headline (up to 55 characters)',b?.headline||'',55)+field('brand','Brand / channel',b?.brand||'',35)+field('subtitle','Subtitle (optional)',b?.subtitle||'',85)+`<label>Accent colour<input type="color" name="accent" value="${esc(b?.accent||'#dca747')}"></label>`;
 const values=form=>Object.fromEntries(new FormData(form));
 function render(){if(!data)return;const c=data.cases.find(c=>c.id===selected);
 body.innerHTML=`<p><b>LOCAL WORKFLOW LAB</b> · Marketplace accounts not connected. All orders here are rehearsals; real sales €0.</p><p>BRIEF → PROPOSAL → LOCAL ORDER → PRODUCTION → VISUAL QA → HANDOFF</p><div class="businessCards"><div>Cases<b>${data.summary.total}</b></div><div>Awaiting QA<b>${data.summary.review}</b></div><div>Ready for handoff<b>${data.summary.ready}</b></div></div><details><summary>Service offer and scope</summary><h3>${esc(data.offer.name)}</h3><p>${esc(data.offer.scope)}</p><p>Two 1280 × 720 PNGs · one revision · 48-hour proposed delivery after complete requirements. No call required.</p><p>Upwork / Freelancer / Fiverr: NOT CONNECTED</p></details><button class="termBtn" id="salesNew">NEW CASE</button><button class="termBtn" id="salesDemo">CREATE SAMPLE BRIEF</button><button class="termBtn" id="salesRefresh">REFRESH</button><nav class="businessTabs">${data.cases.map(x=>`<button class="termBtn" data-case="${esc(x.id)}">${esc(x.client)} · ${esc(x.state.replaceAll('_',' '))}</button>`).join('')}</nav>`;
 body.innerHTML+=`<p>SERVER PRODUCTION · ${data.production.running?'RUNNING':'PAUSED'} · ${data.summary.queued} queued · ${data.summary.producing} producing · ${data.summary.failed} failed. Approved orders run automatically, one at a time, alongside the website factory.</p>`;
 if(!c){body.innerHTML+=`<form id="salesCreate"><h3>New local brief</h3>${field('client','Client / test-case label') }<label>Requested work<textarea name="request" maxlength="1500" required></textarea></label>${briefFields()}<label><input type="checkbox" name="requiresCall"> Client requires a call</label><label><input type="checkbox" name="unlimitedRevisions"> Client requires unlimited revisions</label><button class="termBtn">SAVE AND QUALIFY</button></form>`;}
 else{
  body.innerHTML+=`<h3>${esc(c.client)} · ${esc(c.state.replaceAll('_',' '))}</h3><p>${esc(c.request)}</p>${c.reason?`<p>${esc(c.reason)}</p>`:''}<p>Revision ${c.revisions}/1 · artifact version ${c.version}</p>${c.brief?`<p>Active brief: ${esc(c.brief.headline)} · ${esc(c.brief.brand)}</p>`:""}${c.revisionNote?`<p>Revision request: ${esc(c.revisionNote)}</p>`:""}`;
  if(['NEEDS_BRIEF','QUALIFIED'].includes(c.state))body.innerHTML+=`<form id="salesBrief">${briefFields(c.brief)}<button class="termBtn">SAVE BRIEF</button></form>`;
  if(c.state==='QUALIFIED')body.innerHTML+=`<form id="salesProposal"><h3>Proposal economics — editable assumptions</h3>${field('quote','Proposed price EUR','25')}${field('cost','Estimated total production/revision cost EUR','10')}${field('feePercent','Platform fee reserve %, not a verified rate','20')}<button class="termBtn">DRAFT PROPOSAL</button></form>`;
  if(c.proposal)body.innerHTML+=`<h3>Proposal draft · unsent</h3><p>${esc(c.proposal.text)}</p><p>Estimated margin: €${(c.proposal.estimatedMarginCents/100).toFixed(2)}. ${esc(c.proposal.note)}</p>`;
  if(c.state==='PROPOSAL_DRAFT')body.innerHTML+='<button class="termBtn" data-action="approve-local">APPROVE LOCAL TEST ORDER</button>';
  if(['QUEUED','PRODUCING'].includes(c.state))body.innerHTML+=`<p role="status">${!data.production.running?'Factory paused. This saved order will resume with START FACTORY.':c.state==='PRODUCING'?'Server worker is drawing two PNG thumbnails…':'Queued for automatic server production.'} You can close this browser.</p>`;
  if(c.production?.error)body.innerHTML+=`<p>Production error: ${esc(c.production.error)} · ${c.production.failures}/3 failed attempts. ${c.state==='QUEUED'?'Automatic retry after '+esc(c.production.nextAttemptAt):''}</p>`;
  if(c.state==='PRODUCTION_FAILED')body.innerHTML+='<button class="termBtn" data-action="retry-production">RETRY PRODUCTION</button>';
  if(c.state==='NEEDS_CORRECTION')body.innerHTML+=`<form id="salesCorrection"><h3>Correct the brief before producing again</h3><p>The compositor follows these fields. Update the text or colour to address the review; renderer defects need a code fix.</p>${briefFields(c.brief)}<button class="termBtn">QUEUE CORRECTED BRIEF</button></form>`;
  if(c.version){body.innerHTML+=`<div class="salesPreviews">${['thumbnail-a.png','thumbnail-b.png'].map(name=>`<img alt="${name} version ${c.version}" src="/api/sales/preview?id=${c.id}&version=${c.version}&name=${name}">`).join('')}</div><p><a href="/api/sales/package?id=${c.id}&version=${c.version}">DOWNLOAD VERSION ${c.version} ZIP</a> · Operator review package; not an external delivery</p>`;}
  if(c.state==='REVIEW_REQUIRED')body.innerHTML+='<form id="salesQa"><h3>Visual QA required</h3><p>Check headline spelling, readability at small size, clipping, contrast and brief match. PNG integrity passed; visual quality is not automatically certified.</p><label>Review notes<textarea name="note" required maxlength="500"></textarea></label><button class="termBtn" name="passed" value="true">PASS VISUAL QA</button><button class="termBtn" name="passed" value="false">RETURN TO PRODUCTION</button></form>';
  if(c.qa?.visualNote)body.innerHTML+=`<p>Visual review: ${esc(c.qa.visualNote)}</p>`;
  if(['DELIVERY_READY','HANDOFF_PREPARED'].includes(c.state)){
   if(c.revisions<1)body.innerHTML+=`<details><summary>Request included revision</summary><form id="salesRevision">${briefFields(c.brief)}<label>Consolidated revision note<textarea name="note" required maxlength="500"></textarea></label><button class="termBtn">QUEUE REVISION</button></form></details>`;
   if(c.state==='DELIVERY_READY')body.innerHTML+='<button class="termBtn" data-action="handoff">PREPARE DELIVERY HANDOFF</button>';
  }
  if(c.handoff)body.innerHTML+=`<h3>Delivery message draft · NOT SENT</h3><p>${esc(c.handoff.text)}</p>`;
  if(c.state==='HANDOFF_PREPARED')body.innerHTML+='<button class="termBtn" data-action="close-local">COMPLETE LOCAL REHEARSAL</button>';
  if(c.state==='CLOSED_LOCAL')body.innerHTML+='<p>Local workflow completed. No client acceptance, external delivery or revenue claimed.</p>';
  body.innerHTML+=`<details><summary>Workflow history</summary>${c.history.map(h=>`<p>${esc(h.at)} · ${esc(h.action)} → ${esc(h.state)}</p>`).join('')}</details>`;
 }
 body.querySelector('#salesNew').onclick=()=>{selected=null;render();};body.querySelector('#salesRefresh').onclick=()=>work(load);
 body.querySelector('#salesDemo').onclick=()=>work(async()=>{const c=await api('/cases',{client:'SAMPLE · Maker channel',request:'Two text-led covers for a workshop video. No photo editing.',headline:'BUILD SOMETHING BRILLIANT',brand:'MAKER NOTES',subtitle:'A practical weekend project',accent:'#e8a83e'});selected=c.id;});
 body.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>{selected=b.dataset.case;render();});
 const bind=(id,fn)=>{const f=body.querySelector('#'+id);if(f)f.onsubmit=e=>{e.preventDefault();const v=values(f);work(()=>fn(v,e.submitter));};};
 bind('salesCreate',async v=>{const x=await api('/cases',{...v,requiresCall:v.requiresCall==='on',unlimitedRevisions:v.unlimitedRevisions==='on'});selected=x.id;});
 const action=(action,extra={})=>api('/action',{id:c.id,expectedVersion:c.version,action,...extra});
 bind('salesBrief',v=>action('brief',v));bind('salesCorrection',v=>action('correction',v));bind('salesProposal',v=>action('proposal',{quote:Number(v.quote),cost:Number(v.cost),feePercent:Number(v.feePercent)}));bind('salesQa',(v,b)=>action('qa',{...v,passed:b.value==='true'}));bind('salesRevision',v=>action('revision',v));
 body.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>work(()=>action(b.dataset.action)));
 }
 document.getElementById('openSales').onclick=()=>{panel.hidden=false;work(load);};document.getElementById('closeSales').onclick=()=>{panel.hidden=true;document.getElementById('openSales').focus();};panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;e.stopPropagation();document.getElementById('openSales').focus();}});
 // Refresh only queue views, never replace a brief or QA form while it is being edited.
 let polling=false;
 setInterval(async()=>{
  const c=data?.cases.find(c=>c.id===selected);
  if(panel.hidden||busy||polling||!c||!['QUEUED','PRODUCING'].includes(c.state))return;
  polling=true;const id=selected,previous=data;
  try{const next=await api();if(!busy&&selected===id&&data===previous&&!panel.hidden){const changed=JSON.stringify(next)!==JSON.stringify(data);data=next;if(changed){const top=body.scrollTop;render();body.scrollTop=top;status.textContent='Server queue updated. Visual review remains required.';}}}catch(e){status.textContent='Queue refresh failed: '+e.message;}finally{polling=false;}
 },1500);
}
