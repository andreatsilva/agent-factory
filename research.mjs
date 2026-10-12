// Public metadata adapters. No paid content, credentials, seller assets or arbitrary crawling.
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function robotsAllows(text,path){
 let relevant=false;const rules=[];
 for(const raw of text.split(/\r?\n/)){const line=raw.split('#')[0].trim();const m=line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);if(!m)continue;if(m[1].toLowerCase()==='user-agent'){relevant=m[2]==='*'||/neo-factory/i.test(m[2]);continue;}if(relevant&&m[2]){const end=m[2].endsWith('$'),pattern=(end?m[2].slice(0,-1):m[2]).split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');if(new RegExp('^'+pattern+(end?'$':'')).test(path))rules.push({allow:m[1].toLowerCase()==='allow',length:m[2].replace(/[*$]/g,'').length});}}
 return !rules.length||rules.sort((a,b)=>b.length-a.length||Number(b.allow)-Number(a.allow))[0].allow;
}
export function parseMarketplace(html){
 const cells=html.split(/<div\b[^>]*class="game_cell\s[^>]*>/i).slice(1);const out=[];
 for(const [index,cell] of cells.entries()){
  const title=cell.match(/class="game_title">\s*<a\b([^>]*)>([\s\S]*?)<\/a>/i);const href=title?.[1].match(/href="(https:\/\/[^"]+)"/i)?.[1];
  const price=cell.match(/class="price_value">\s*\$([\d,.]+)/i);const description=cell.match(/class="game_text">([\s\S]*?)<\/div>/i);
  if(!title||!href||!price)continue;
  out.push({title:plain(title[2]),url:href,source:'itch.io',source_type:'marketplace_top_sellers',rank:index+1,price:Number(price[1].replace(/,/g,'')),currency:'USD',description:plain(description?.[1]).slice(0,240),evidence:'Listed in the public top-selling tools category with a displayed paid price. Sales units and revenue are not disclosed.',digital:true});
 }
 return out;
}
export const sourceAdapters=[
 {id:'itch-tools',ttl:6*3600000,async collect({getText}){
  const robots=await getText('https://itch.io/robots.txt',6*3600000);
  if(!robotsAllows(robots,'/tools/top-sellers'))throw Error('Marketplace robots.txt disallows this listing');
  const rows=parseMarketplace(await getText('https://itch.io/tools/top-sellers',6*3600000));
  if(!rows.length)throw Error('Marketplace returned no recognizable priced listings; parser or access requires review');return rows;
 }},
 {id:'hn-digital-pain',ttl:3600000,async collect({getJson}){
  const cutoff=Math.floor(Date.now()/1000)-180*86400;
  const data=await getJson('https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=20&numericFilters=created_at_i%3E'+cutoff+'&query='+encodeURIComponent('sprite sheet'),3600000);
  return (data.hits||[]).filter(h=>h.title).map(h=>({title:h.title,url:h.url||'https://news.ycombinator.com/item?id='+h.objectID,source:'Hacker News / Algolia',source_type:'discussion',points:h.points||0,comments:h.num_comments||0,published_at:h.created_at||null,description:plain(h.story_text).slice(0,300),evidence:'Public discussion engagement; not proof of purchases.',digital:/sprite|pixel|palette|image|tool/i.test(h.title)}));
 }}
];
export function evaluateMarket(signals){
 const pixel=signals.filter(s=>s.digital&&/pixel|sprite|palette/i.test(s.title+' '+s.description));
 const paid=pixel.filter(s=>s.source_type==='marketplace_top_sellers'&&s.price>0);
 const discussion=pixel.filter(s=>s.source_type==='discussion');
 const approved=paid.length>=2;
 const evidence=paid.slice(0,8).map(s=>({url:s.url,title:s.title,kind:s.source_type,price:s.price,currency:s.currency,rank:s.rank,observation:s.evidence}));
 const score=approved?Math.min(88,68+paid.length*2):Math.min(45,discussion.length*5);
 const candidate={key:'pixel-production-workbench',title:'Sprite Production Workbench',category:'downloadable pixel-art utility',source_url:'https://itch.io/tools/top-sellers#pixel-production-workbench',strategy:'proven-market-adaptation',digital_only:true,evidence,discussion:discussion.slice(0,5),demand_score:approved?80:30,competition_score:Math.min(100,paid.length*10),gap_score:60,buyer_intent_score:approved?75:25,creation_effort:'small: original browser-local utility plus documentation',token_cost_estimate:1800,support_burden:'low: offline, no accounts or hosted API',price_suitability:approved?75:35,neo_score:score,decision:approved?'approved':'needs_evidence',reason:approved?'Multiple paid listings in a public top-selling digital-tool category support this format. Build our own focused utility; do not reproduce competing editors.':'At least two priced, top-selling digital-tool references are required. Discussion alone does not validate purchase demand.',complaints:[],feature_gap:'Hypothesis to validate: an offline, account-free sheet slicer, frame manifest exporter and palette report in one portable package.',unknowns:['Actual sales volume and revenue are not public','Customer complaints are not established by listing metadata','The proposed feature gap is a hypothesis, not a sourced complaint','USD comparator prices are not converted to EUR']};
 const rejected=signals.filter(s=>!s.digital||!/pixel|sprite|palette/i.test(s.title+' '+s.description)).slice(0,20).map(s=>({title:s.title,url:s.url,reason:!s.digital?'Not identified as a digital product':'Outside the currently implemented low-support product format; do not manufacture unsupported products'}));
 return {candidate,rejected};
}
export function manufacturingBrief(candidate){return {name:candidate.title,product_type:'offline-sprite-workbench',target_buyer:'Indie game developers and pixel artists organizing their own sprite assets',problem:'Turn a user-owned sprite sheet into usable frame metadata, individual PNG frames, and a consistent palette report without installing a full editor.',proven_market_references:candidate.evidence,required_features:['Local PNG/JPEG sprite sheet import','Grid dimensions, margins and spacing with validated frame geometry','Individual frame PNG export','JSON atlas manifest export','Palette extraction and color frequency report','Portable usage guide and QA checklist'],differentiation:'A small private workflow utility with no login, network upload or subscription; original implementation, not a clone of a referenced editor.',expected_files:['workbench.html','START-HERE.md','asset-register.csv','release-checklist.md','market-evidence.json','manufacturing-brief.json','LICENSE.txt'],quality_criteria:['No external runtime dependency','No source assets copied','Valid grid geometry with no out-of-bounds crops','Exports parseable JSON and PNG frames','Works offline after extraction','Clear limits and instructions'],price_cents:2000,currency:'EUR',estimated_token_budget:1800,originality:'References describe market format and prices only. Do not reuse competitor names, prose, source code, artwork, or paid files.'};}
