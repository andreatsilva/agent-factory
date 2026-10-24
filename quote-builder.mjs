// Pure, bounded quote data shared by the generated runtime and its tests.
export function normalizeQuote(raw) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Choose a valid quote backup.');
 const text=(v,max)=>{if(typeof v!=='string'||v.length>max)throw Error('A text field is missing or too long.');return v.trim();};
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('A numeric value is outside the supported range.');return v;};
 const date=v=>{if(v==='')return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Use a valid date.');return v;};
 if(!['EUR','USD','GBP'].includes(raw.currency))throw Error('Unsupported currency.');
 if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>50)throw Error('A quote needs between 1 and 50 line items.');
 return {number:text(raw.number,50),seller:text(raw.seller,300),client:text(raw.client,300),date:date(raw.date),validUntil:date(raw.validUntil),currency:raw.currency,discount:number(raw.discount,0,100),tax:number(raw.tax,0,100),notes:text(raw.notes,2000),items:raw.items.map(item=>{
  if(!item||typeof item!=='object')throw Error('Invalid line item.');
  const quantity=number(item.quantity,0.01,10000),rate=number(item.rate,0,1000000);
  if(Math.abs(quantity*100-Math.round(quantity*100))>0.0001||Math.abs(rate*100-Math.round(rate*100))>0.0001)throw Error('Use no more than two decimal places.');
  return {description:text(item.description,200),quantity,rate};
 })};
}
export function quoteTotals(raw){
 const q=normalizeQuote(raw),lines=q.items.map(i=>Math.round(Math.round(i.quantity*100)*Math.round(i.rate*100)/100));
 const subtotal=lines.reduce((a,b)=>a+b,0),discount=Math.round(subtotal*q.discount/100),tax=Math.round((subtotal-discount)*q.tax/100);
 return {lines,subtotal,discount,tax,total:subtotal-discount+tax};
}
export function readQuoteBackup(text){
 if(typeof text!=='string'||text.length>100000)throw Error('Backup is too large.');
 const data=JSON.parse(text);if(data?.app!=='quote'||data.version!==1)throw Error('This is not a quote-builder backup.');
 return normalizeQuote(data.quote);
}
function quoteRuntime(config,normalizeQuote,quoteTotals,readQuoteBackup){
 const $=id=>document.getElementById(id),key='neo-quotes-'+config.id;
 if(window.self!==window.top){$('print').disabled=true;$('print').textContent='Download app to print';$('export').disabled=true;$('export').textContent='Download app to export';}
 const fields=['number','seller','client','date','validUntil','currency','discount','tax','notes'];
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const blank=()=>({number:'Q-001',seller:'',client:'',date:today(),validUntil:'',currency:'EUR',discount:0,tax:0,notes:'',items:[{description:'',quantity:1,rate:0}]});
 let drafts=[],active=null,quote=blank(),storage=true;
 const say=text=>$('message').textContent=text;
 let pendingChange=null;
 function confirmChange(text,fn){pendingChange=fn;$('confirmText').textContent=text;$('confirmation').hidden=false;$('confirmChange').focus();}
 $('confirmChange').onclick=()=>{const fn=pendingChange;pendingChange=null;$('confirmation').hidden=true;fn?.();};
 $('cancelChange').onclick=()=>{pendingChange=null;$('confirmation').hidden=true;options();};
 function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function action(text,fn){const b=element('button',text);b.type='button';b.onclick=fn;return b;}
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved)||saved.length>100)throw Error('Invalid drafts');drafts=saved.map(d=>({id:String(d.id).slice(0,100),quote:normalizeQuote(d.quote)}));}catch{storage=false;$('storage').textContent='Local storage is unavailable or saved drafts need repair. Use Backup / restore to keep your quote.';}
 function money(cents){return new Intl.NumberFormat('en',{style:'currency',currency:quote.currency}).format(cents/100);}
 function readForm(){for(const name of fields)quote[name]=['discount','tax'].includes(name)?Number($(name).value):$(name).value;return normalizeQuote(quote);}
 function options(){const select=$('drafts');select.replaceChildren();const first=element('option','Choose a saved draft');first.value='';select.append(first);for(const d of drafts){const o=element('option',d.quote.number+' · '+(d.quote.client.split('\n')[0]||'Unnamed client'));o.value=d.id;select.append(o);}select.value=active||'';$('delete').disabled=!active;}
 function preview(){try{
  const q=readForm(),totals=quoteTotals(q);$('previewNumber').textContent=q.number||'Draft quote';$('previewSeller').textContent=q.seller||'Your business';$('previewClient').textContent=q.client||'Client details';$('previewDate').textContent=q.date+ (q.validUntil?' · Valid until '+q.validUntil:'');$('previewNotes').textContent=q.notes;
  const body=$('previewLines');body.replaceChildren();q.items.forEach((i,index)=>{const tr=element('tr');for(const value of [i.description||'Untitled item',i.quantity,money(Math.round(i.rate*100)),money(totals.lines[index])])tr.append(element('td',value));body.append(tr);});
  $('subtotal').textContent=money(totals.subtotal);$('discountTotal').textContent='−'+money(totals.discount);$('taxTotal').textContent=money(totals.tax);$('total').textContent=money(totals.total);$('calculation').textContent='Discount '+q.discount+'% before tax '+q.tax+'%. Each line and adjustment rounded to cents.';$('preview').removeAttribute('data-invalid');
 }catch(e){$('calculation').textContent=e.message;$('preview').setAttribute('data-invalid','true');}}
 function lineEditor(){
  $('lines').replaceChildren();quote.items.forEach((item,index)=>{
   const row=element('div');row.className='line';
   for(const [name,label,type,min,max] of [['description','Item description','text',null,200],['quantity','Quantity','number',.01,10000],['rate','Unit price','number',0,1000000]]){
    const wrap=element('label',label),input=element('input');input.type=type;input.value=item[name];input.setAttribute('aria-label',label+' '+(index+1));input.required=true;
    if(type==='number'){input.min=min;input.max=max;input.step='.01';}else input.maxLength=max;
    input.oninput=()=>{item[name]=type==='number'?(input.value===''?NaN:Number(input.value)):input.value;preview();};wrap.append(input);row.append(wrap);
   }
   const remove=action('Remove',()=>{quote.items.splice(index,1);lineEditor();preview();});remove.setAttribute('aria-label','Remove item '+(index+1));remove.disabled=quote.items.length===1;row.append(remove);$('lines').append(row);
  });$('add').disabled=quote.items.length>=50;
 }
 function load(q,id=null){quote=normalizeQuote(q);active=id;for(const name of fields)$(name).value=quote[name];lineEditor();options();preview();}
 function persist(){try{localStorage.setItem(key,JSON.stringify(drafts));storage=true;}catch{storage=false;}$('storage').textContent=storage?'Drafts are saved in this browser. Export backups to keep a portable copy.':'Draft is kept in this session only. Export a backup before closing.';options();}
 $('editor').oninput=preview;
 $('editor').onsubmit=e=>{e.preventDefault();try{const q=readForm();if(!active&&drafts.length>=100)throw Error('100 drafts reached. Export and remove an older draft first.');
  active=active||String(Date.now())+'-'+Math.random().toString(36).slice(2);const existing=drafts.find(d=>d.id===active);if(existing)existing.quote=q;else drafts.push({id:active,quote:q});persist();say(storage?'Draft saved.':'Draft kept in memory. Export a backup.');}catch(e){say(e.message);}};
 $('add').onclick=()=>{if(quote.items.length>=50)return;quote.items.push({description:'',quantity:1,rate:0});lineEditor();preview();};
 $('new').onclick=()=>{confirmChange('Start a new quote? Save or export your current changes first.',()=>{load(blank());say('New quote.');});};
 $('drafts').onchange=()=>{const selected=drafts.find(d=>d.id===$('drafts').value);if(selected){confirmChange('Open this draft? Unsaved changes will be replaced.',()=>{load(selected.quote,selected.id);say('Draft opened.');});}};
 $('delete').onclick=()=>{if(!active)return;confirmChange('Delete this saved draft?',()=>{drafts=drafts.filter(d=>d.id!==active);active=null;persist();say('Saved draft deleted. Current quote remains available to export.');});};
 function backup(){const q=readForm();return JSON.stringify({app:'quote',version:1,quote:q},null,2);}
 $('copyBackup').onclick=()=>{try{$('backup').value=backup();say('Backup ready. Copy the text or download it.');}catch(e){say(e.message);}};
 $('export').onclick=()=>{try{const data=backup();$('backup').value=data;const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=element('a');a.href=url;a.download='quote-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){say(e.message);}};
 $('restore').onclick=()=>{try{const q=readQuoteBackup($('backup').value);confirmChange('Load this backup? Save your current changes first. Existing saved drafts will be kept.',()=>{load(q);say('Backup restored as a new draft. Save to keep it.');});}catch(e){say('Restore failed: '+e.message);}};
 $('print').onclick=()=>{if(!$('editor').reportValidity())return;try{readForm();preview();window.print();}catch(e){say(e.message);}};
 load(blank());if(drafts.length)load(drafts[drafts.length-1].quote,drafts[drafts.length-1].id);
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function quoteDocument(b,id){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(b.brand)} · Quote Builder</title><style>
 *{box-sizing:border-box}body{margin:0;background:#eef1f2;color:#172c33;font:15px/1.55 system-ui}header{background:#173f46;color:#fff;padding:20px 4vw;display:flex;justify-content:space-between;gap:18px;align-items:center}header p{margin:3px 0;color:#b7d5d7}.tools{display:flex;gap:8px;flex-wrap:wrap}button,input,textarea,select{font:inherit}button{padding:10px 14px;background:#fff;color:#173f46;border:1px solid #bbcace;border-radius:6px;cursor:pointer}button:hover{background:#e5f4ed}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #dfb95f;outline-offset:2px}main{max-width:1600px;margin:auto;padding:32px 4vw}.intro{max-width:750px}h1{font:48px/1.1 Georgia;margin:12px 0}h2{font-size:19px;margin:0 0 16px}.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:700;text-transform:uppercase}.workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start;margin-top:28px}.panel{background:white;border:1px solid #d4dde0;border-radius:12px;padding:25px}label{font-size:12px;font-weight:650;display:block}input,textarea,select{display:block;width:100%;border:1px solid #bdcbd0;border-radius:5px;padding:9px;margin:5px 0 14px;background:#fff;color:#172c33}textarea{resize:vertical;min-height:80px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:15px}.line{display:grid;grid-template-columns:minmax(100px,2fr) minmax(65px,1fr) minmax(80px,1fr) auto;gap:8px;align-items:center;padding-top:12px;border-top:1px solid #e1e7e8}.line button{padding:8px;font-size:12px}.primary{background:#173f46;color:#fff}.primary:hover{background:#22555e}[hidden]{display:none!important}#confirmation{background:#fff4d9;padding:14px;margin:16px 0;border:1px solid #cfb675}#confirmation p{margin:0 0 10px}.draftbar{display:flex;gap:8px;align-items:center;margin-bottom:16px}.draftbar select{margin:0;min-width:0}#preview{border-top:6px solid #173f46;border-radius:2px;box-shadow:0 14px 35px #1b353c12;min-height:600px}#preview[data-invalid=true]{opacity:.6}.quote-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:30px}.quote-head strong{font:32px Georgia}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}.muted{color:#63777c;font-size:12px}table{border-collapse:collapse;width:100%;margin:28px 0;table-layout:fixed}th,td{text-align:right;padding:12px 6px;border-bottom:1px solid #e3e8e9;overflow-wrap:anywhere;font-size:13px}th:first-child,td:first-child{text-align:left;width:43%}th{font-size:10px;text-transform:uppercase;color:#63777c}.totals{max-width:300px;margin-left:auto}.totals p{display:flex;justify-content:space-between;gap:12px;margin:8px 0}.grand{border-top:2px solid #173f46;padding-top:12px;font-size:24px;font-weight:700}#message{min-height:24px;color:#285742}details{margin-top:22px}summary{cursor:pointer;font-weight:700}#backup{font:12px monospace;min-height:120px}small{display:block;margin:14px 0}#previewNotes{margin-top:32px;border-top:1px solid #d4dde0;padding-top:18px}@media(max-width:1050px){.workspace{grid-template-columns:1fr}}@media(max-width:560px){header{align-items:flex-start;flex-direction:column}h1{font-size:36px}.panel{padding:16px}.line{grid-template-columns:1fr 1fr}.line label:first-child{grid-column:1/-1}.line button{grid-column:1/-1;margin-bottom:12px}.pair{grid-template-columns:1fr}.quote-head{flex-direction:column}.grand{font-size:20px}}@media print{body{background:white}header,.intro,#editorPanel,#message,#storage{display:none!important}main{padding:0;max-width:none}.workspace{display:block;margin:0}#preview{box-shadow:none;border:0;padding:0;min-height:0}tr{break-inside:avoid}.totals{break-inside:avoid}@page{margin:18mm}}
 </style></head><body><header><div><strong>${escape(b.brand)}</strong><p>Quote Builder / Offline studio</p></div><div class="tools"><button id="new">New quote</button><button id="export">Export backup</button><button id="print">Print / Save PDF</button></div></header><main><div class="intro"><p class="eyebrow">Scope it. Price it. Make it clear.</p><h1>A considered quote,<br>ready for your next project.</h1><p>Build an itemized proposal with a live printable preview. Your drafts stay on this device.</p></div><div class="workspace"><section class="panel" id="editorPanel"><h2>Your quote</h2><div class="draftbar"><select id="drafts" aria-label="Saved drafts"></select><button id="delete" type="button">Delete draft</button></div><div id="confirmation" role="alert" hidden><p id="confirmText"></p><button id="confirmChange" type="button">Confirm change</button> <button id="cancelChange" type="button">Keep current quote</button></div><form id="editor">
 <div class="pair"><label>Quote number<input id="number" maxlength="50" required></label><label>Currency<select id="currency"><option>EUR</option><option>USD</option><option>GBP</option></select></label></div>
 <div class="pair"><label>Your business<textarea id="seller" maxlength="300" required></textarea></label><label>Client details<textarea id="client" maxlength="300" required></textarea></label></div>
 <div class="pair"><label>Quote date<input id="date" type="date" required></label><label>Valid until<input id="validUntil" type="date"></label></div>
 <h2>Line items</h2><div id="lines"></div><button id="add" type="button">+ Add line item</button>
 <div class="pair" style="margin-top:20px"><label>Discount (%)<input id="discount" type="number" min="0" max="100" step=".01" required></label><label>Tax (%)<input id="tax" type="number" min="0" max="100" step=".01" required></label></div>
 <label>Notes and terms<textarea id="notes" maxlength="2000"></textarea></label><button class="primary" type="submit">Save draft</button></form>
 <details><summary>Backup / restore</summary><p class="muted">Copy or paste a quote backup. Restoring opens a new draft and keeps existing saved drafts.</p><label>Backup JSON<textarea id="backup" maxlength="100000" spellcheck="false"></textarea></label><div class="tools"><button id="copyBackup">Prepare backup</button><button id="restore">Restore backup</button></div></details></section>
 <section class="panel" id="preview" aria-label="Quote preview"><div class="quote-head"><div><p class="eyebrow">Proposal / Quote</p><strong id="previewNumber"></strong></div><p class="preserve" id="previewSeller"></p></div><p class="eyebrow">Prepared for</p><p class="preserve" id="previewClient"></p><p id="previewDate" class="muted"></p>
 <table><thead><tr><th>Scope</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody id="previewLines"></tbody></table><div class="totals"><p>Subtotal <span id="subtotal"></span></p><p>Discount <span id="discountTotal"></span></p><p>Tax <span id="taxTotal"></span></p><p class="grand">Total <span id="total"></span></p></div><p id="calculation" class="muted"></p><p class="preserve" id="previewNotes"></p><small class="muted">Estimate only · No payment is collected by this document.</small></section></div><p id="message" role="status"></p><small id="storage">Drafts stay in this browser. No accounts, payment collection, electronic signatures or automatic tax rules. Enter your own rates.</small></main><script>(()=>{const normalizeQuote=${normalizeQuote.toString()},quoteTotals=${quoteTotals.toString()},readQuoteBackup=${readQuoteBackup.toString()};(${quoteRuntime.toString()})(${JSON.stringify({id}).replace(/</g,'\\u003c')},normalizeQuote,quoteTotals,readQuoteBackup);})();</script></body></html>`;
}

