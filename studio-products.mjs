import {workspaceDocument} from './app-workspaces.mjs';
import {APP_PROFILES,appProfile} from './product-strategy.mjs';
import {createHash} from 'node:crypto';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {makeZip,inspectZip} from './zip.mjs';
import {renderSalesBrief} from './sales-renderer.mjs';
import {checkPng} from './sales-engine.mjs';
export const STUDIO_TYPES=['thumbnail','logo','app','image'];
export const productDescription=(kind,niche)=>({
 thumbnail:'Two original text-led YouTube thumbnail compositions for '+niche+'. Includes 1280 × 720 PNG files and editable design values. No photographs, videos or software features.',
 image:'An AI-generated editorial illustration for '+niche+'. Includes the original 768 × 432 PNG and generation details. Visual review is required before use.',
 logo:'An editable geometric SVG logo concept for '+niche+', with PNG preview and color palette. Review and trademark checks are required before use.',
 app:'A standalone offline checklist and 25-minute focus timer for '+niche+'. Includes editable HTML, saved checklist progress and timer controls. No backend, accounts or online synchronization.'
})[kind];
export const STUDIO_SCHEMA={type:'object',additionalProperties:false,required:['brand','headline','description','accent','items'],properties:{
 brand:{type:'string',minLength:3,maxLength:28},headline:{type:'string',minLength:3,maxLength:50},
 description:{type:'string',minLength:20,maxLength:350},accent:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},
 items:{type:'array',minItems:3,maxItems:6,items:{type:'string',minLength:3,maxLength:80}}
}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateStudioBrief(b){
 if(!b||typeof b!=='object')throw Error('Missing creative brief');
 for(const [key,max] of [['brand',28],['headline',50],['description',350]])if(typeof b[key]!=='string'||b[key].trim().length<3||b[key].length>max||/[<>]/.test(b[key]))throw Error('Invalid '+key);
 if(!/^#[0-9a-f]{6}$/i.test(b.accent))throw Error('Invalid accent');
 if(!Array.isArray(b.items)||b.items.length<3||b.items.length>6||b.items.some(x=>typeof x!=='string'||x.length<3||x.length>80||/[<>]/.test(x)))throw Error('Invalid workflow items');
 return {brand:b.brand.trim(),headline:b.headline.trim(),description:b.description.trim(),accent:b.accent,items:b.items.map(x=>x.trim())};
}
export function appDocument(b,id){
 const key=JSON.stringify('neo-app-'+id),items=b.items.map((v,i)=>`<label><input type="checkbox" data-item="${i}"> ${esc(v)}</label>`).join('');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.brand)}</title><style>body{margin:0;background:#101b26;color:#e8edf5;font:18px system-ui}main{max-width:760px;margin:40px auto;padding:24px}h1{font-size:42px}label{display:block;padding:15px;background:#1c2b3b;margin:8px 0;border-radius:8px}button,input{font:inherit}button{padding:12px 20px;margin:8px;background:${b.accent};border:0;border-radius:5px}output{font:48px monospace;display:block}progress{width:100%}small{display:block;margin:16px 0;color:#b5c3d4}</style><main><p>${esc(b.brand)}</p><h1>${esc(b.headline)}</h1><p>${esc(b.description)}</p><section aria-label="Checklist">${items}<progress id="progress" value="0" max="${b.items.length}"></progress><p id="done" role="status"></p><button id="reset">Reset checklist</button></section><section aria-label="Focus timer"><h2>Focus session</h2><output id="clock" aria-live="off">25:00</output><button id="start">Start timer</button><button id="pause">Pause timer</button><button id="restart">Reset timer</button></section><small id="storage">Checklist is saved in this browser. No accounts, analytics or network requests.</small></main><script>
const key=${key},boxes=[...document.querySelectorAll('[data-item]')];let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{document.getElementById('storage').textContent='Storage unavailable in this preview; download and open the app to save your checklist.'}boxes.forEach((box,i)=>{box.checked=saved[i]===true;box.onchange=update});function update(){const values=boxes.map(b=>b.checked);document.getElementById('progress').value=values.filter(Boolean).length;document.getElementById('done').textContent=values.filter(Boolean).length+' / '+boxes.length+' completed';try{localStorage.setItem(key,JSON.stringify(values))}catch{}}update();document.getElementById('reset').onclick=()=>{boxes.forEach(b=>b.checked=false);update()};let remaining=1500,deadline=0,timer=null;function draw(){const s=Math.max(0,Math.ceil(remaining));document.getElementById('clock').textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}function pause(){if(timer){remaining=Math.max(0,(deadline-Date.now())/1000);clearInterval(timer);timer=null;draw()}}document.getElementById('start').onclick=()=>{if(timer||remaining<=0)return;deadline=Date.now()+remaining*1000;timer=setInterval(()=>{remaining=Math.max(0,(deadline-Date.now())/1000);draw();if(!remaining)pause()},250)};document.getElementById('pause').onclick=pause;document.getElementById('restart').onclick=()=>{pause();remaining=1500;draw()};
</script></html>`;
}
function logoSvg(b,id){
 const n=parseInt(createHash('sha256').update(id).digest('hex').slice(0,4),16),points=Array.from({length:6},(_,i)=>{const a=(i*60+n%60)*Math.PI/180,r=i%2?100:150;return `${260+Math.cos(a)*r},${270+Math.sin(a)*r}`;}).join(' ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><polygon points="${points}" fill="${b.accent}"/><circle cx="260" cy="270" r="46" fill="#132436"/><text x="465" y="285" fill="#e7edf5" font-family="Arial" font-weight="bold" font-size="55">${esc(b.brand)}</text><text x="100" y="550" fill="#afbecd" font-family="Arial" font-size="27">${esc(b.headline)}</text></svg>`;
}
async function png(svg){const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.fillStyle='#132436';ctx.fillRect(0,0,1280,720);ctx.drawImage(await loadImage(Buffer.from(svg)),0,0);return canvas.toBuffer('image/png');}
export async function buildStudioProduct(kind,raw,id,signal,{generateImage,variant='focus',researchSpec}={}){
 const b=validateStudioBrief(raw);if(kind==='app'&&!APP_PROFILES[variant])throw Error('Unsupported app capability');b.description=kind==='app'?appProfile(variant).difference:productDescription(kind,b.brand);signal?.throwIfAborted();let files={},preview,html=null;
 let imageMetadata;
 if((kind==='thumbnail'||kind==='image')&&generateImage){
  const illustration=await generateImage(`Editorial illustration of ${b.items[0]}, ${b.headline}. Clear recognizable subject, vivid colors, professional lighting, clean background, wide composition, no text, no logos.`,signal);
  files['original-image.png']=illustration.png;imageMetadata=illustration.metadata;
  files['generation.json']=JSON.stringify(imageMetadata,null,2);
  if(kind==='image')preview=illustration.png;
  else{
   const background=await loadImage(illustration.png);
   for(let variant=0;variant<2;variant++){
    const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.drawImage(background,0,0,1280,720);
    const gradient=ctx.createLinearGradient(0,0,variant?1100:1000,0);gradient.addColorStop(0,'rgba(5,12,25,.94)');gradient.addColorStop(1,'rgba(5,12,25,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
    ctx.fillStyle=b.accent;ctx.fillRect(60,110,8,490);ctx.font='bold 30px Arial';ctx.fillText(b.brand.toUpperCase(),95,145,900);
    ctx.font='bold 76px Arial';ctx.fillStyle='#ffffff';const lines=[];let line='';for(const word of b.headline.split(/\s+/)){if(ctx.measureText((line+' '+word).trim()).width>680&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);
    lines.slice(0,4).forEach((text,i)=>ctx.fillText(text,95,260+i*88,1050));ctx.font='bold 27px Arial';ctx.fillStyle=variant?'#ffffff':b.accent;ctx.fillText(b.items[variant],95,625,1050);
    files['thumbnail-'+(variant+1)+'.png']=canvas.toBuffer('image/png');
   }
   preview=files['thumbnail-1.png'];files['design.json']=JSON.stringify(b,null,2);
   b.description='Two 1280 × 720 YouTube thumbnail compositions with a locally generated illustration, editable design values, original background and generation details.';
  }
 }else if(kind==='image')throw Error('Image generation backend is required');
 else if(kind==='thumbnail'){
  const images=await renderSalesBrief({headline:b.headline,brand:b.brand,subtitle:b.items[0],accent:b.accent},signal);
  files=Object.fromEntries(images.map((image,i)=>['thumbnail-'+(i+1)+'.png',checkPng(Buffer.from(image,'base64'))]));preview=files['thumbnail-1.png'];
  files['design.json']=JSON.stringify(b,null,2);
 }else if(kind==='logo'){files['logo.svg']=logoSvg(b,id);preview=await png(files['logo.svg']);files['logo-preview.png']=preview;files['brand-colors.txt']=b.accent+'\n#132436\n#e7edf5';}
 else if(kind==='app'){
  html=variant==='focus'?appDocument(b,id):workspaceDocument(b,id,variant);files['index.html']=html;
  preview=await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#101b26"/><text x="70" y="100" fill="${b.accent}" font-family="Arial" font-size="30">${esc(b.brand)} / ${esc(appProfile(variant).label.toUpperCase())}</text><text x="70" y="190" fill="#e8edf5" font-family="Arial" font-size="43">${esc(b.headline)}</text>${(variant==='focus'?b.items:appProfile(variant).features).slice(0,4).map((v,i)=>`<rect x="70" y="${245+i*80}" width="32" height="32" fill="${b.accent}"/><text x="125" y="${272+i*80}" fill="#e8edf5" font-family="Arial" font-size="26">${esc(v)}</text>`).join('')}<text x="950" y="360" fill="${b.accent}" font-family="Arial" font-size="65">${variant==='focus'?'25:00':variant==='kanban'?'BOARD':variant==='habit'?'7 DAYS':variant==='expense'?'EUR':'NOTES'}</text></svg>`);
  files['preview.png']=preview;
 }else throw Error('Unsupported studio type');
 files['README.md']=`${b.brand}\n\n${b.description}\n\n${kind==='app'?'Open index.html in a browser. '+appProfile(variant).features.join('. ')+'. Data stays in this browser; export a backup where available. No backend or accounts.':kind==='logo'?'Editable geometric SVG concept. Review at small sizes and check trademark availability before use. No exclusivity or trademark clearance is claimed.':'Two text-led thumbnail compositions. Editable design values are supplied in design.json; no photographs or diffusion imagery.'}\n\nOriginal factory template with locally generated copy. This is a product hypothesis, not proven market demand.`;
 files['LICENSE.txt']='Original generated deliverables, for one project. No third-party photographs or brand assets included. No trademark exclusivity or clearance is promised.';
 if(imageMetadata){files['README.md']=`${b.brand}\n\n${b.description}\n\nGenerated locally with Stable Diffusion 1.5. See generation.json for model revision, prompt and seed. Thumbnails are composed at 1280 × 720 from a 768 × 432 background. Review all imagery before publishing; no exclusivity, market demand or trademark clearance is promised.`;files['LICENSE.txt']='AI-generated image using Stable Diffusion 1.5 under CreativeML OpenRAIL-M. Model license and use restrictions: https://github.com/CompVis/stable-diffusion/blob/main/LICENSE. No exclusivity or third-party rights clearance is promised.';}
 if(researchSpec)files['PRODUCT-ORIGIN.md']='# Research to production\n\nFormat reference: '+researchSpec.source.title+'\nSource: '+researchSpec.source.url+'\n\nImplemented scope: '+researchSpec.features.join('; ')+'\n\nOur differences: '+researchSpec.difference+'\n\n'+researchSpec.limitations;
 const zip=makeZip(files);inspectZip(zip);signal?.throwIfAborted();
 return {zip,preview,html,files:Object.keys(files),imageMetadata,qa:{passed:true,checks:['Archive integrity','Validated bounded design brief',imageMetadata?'Local diffusion image and safety checker':'Deterministic artifact renderer'],visualReview:'REQUIRED'}};
}
