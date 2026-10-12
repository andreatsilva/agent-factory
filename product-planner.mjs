const clean=(value,name,max=500)=>{if(typeof value!=='string')throw Error('Invalid product brief: '+name+' must be text');if(value.trim().length<3||value.length>max)throw Error('Invalid product brief: '+name+' length must be 3–'+max);if(/[<>]|https?:|\b(?:lorem ipsum|TODO)\b/i.test(value))throw Error('Invalid product brief: '+name+' contains code, URL or placeholder');return value.trim();};
const string={type:'string'},threeStrings={type:'array',minItems:3,maxItems:3,items:string};
export const BRIEF_SCHEMA={type:'object',additionalProperties:false,required:['audience','purpose','brand','headline','intro','section','sample','steps','questions','cards'],properties:{audience:string,purpose:string,brand:string,headline:string,intro:string,section:string,sample:string,steps:threeStrings,questions:threeStrings,cards:{type:'array',minItems:3,maxItems:3,items:{type:'array',minItems:2,maxItems:2,items:string}}}};
for(const [key,maxLength] of Object.entries({audience:65,purpose:85,brand:35,headline:140,intro:450,section:70,sample:400}))BRIEF_SCHEMA.properties[key]={type:'string',minLength:3,maxLength};
export function validateBrief(raw){
 if(!raw||typeof raw!=='object')throw Error('Missing product brief');
 const b={};for(const [key,max] of Object.entries({audience:90,purpose:120,brand:40,headline:150,intro:500,section:80,sample:500}))b[key]=clean(raw[key],key,max);
 for(const key of ['steps','questions']){if(!Array.isArray(raw[key])||raw[key].length!==3)throw Error('Brief requires three '+key);b[key]=raw[key].map(v=>clean(v,key,200));}
 if(!Array.isArray(raw.cards)||raw.cards.length!==3)throw Error('Brief requires three distinct sections');
 b.cards=raw.cards.map(pair=>{if(!Array.isArray(pair)||pair.length!==2)throw Error('Invalid section');return [clean(pair[0],'section title',80),clean(pair[1],'section copy',400)];});
 if(new Set(b.cards.map(c=>c[0].toLowerCase())).size!==3)throw Error('Repeated sections');
 const copy=JSON.stringify(b);
 if(/\b(?:permits?|government|toolkit|export|upload|automatically|instant|dashboard|calculator|tracking|payment|checkout)\b|generate.{0,50}(?:quote|proposal)|submit.{0,30}(?:application|form)|receive updates/i.test(copy))throw Error('Brief promises unsupported software or regulated workflow; email enquiry websites only');
 if(!b.sample.startsWith('Illustrative example only. '))b.sample='Illustrative example only. '+b.sample;b.ink='#214a51';b.accent='#ac6741';b.features=b.cards.map(c=>c[0]).concat('Audience-specific enquiry worksheet');return b;
}
const words=s=>new Set(s.toLowerCase().match(/[a-z]{4,}/g)||[]);
const similarity=(a,b)=>{const x=words(a),y=words(b),intersection=[...x].filter(w=>y.has(w)).length;return intersection/Math.max(1,Math.min(x.size,y.size));};
export function assertDistinctBrief(b,existing){
 for(const old of existing.filter(Boolean)){
  if(similarity(b.audience,old.audience)>.8&&similarity(b.purpose,old.purpose)>.65)throw Error('Duplicate audience and purpose');
  if(similarity(b.cards.flat().join(' '),old.cards.flat().join(' '))>.78)throw Error('Product sections too similar to an existing kit');
 }
}
// Alternate service directions avoid repeating the prompt's former ceramicist example.
const DIRECTIONS=[
 ['Acoustic instrument repair studios','Discuss restoring a damaged string instrument'],
 ['Community rehearsal spaces','Enquire about a recurring band rehearsal slot'],
 ['Independent bookbinding workshops','Discuss rebinding a treasured family volume'],
 ['Architectural model makers','Commission a physical presentation model'],
 ['Small batch coffee roasters','Discuss a wholesale blend for a local cafe'],
 ['Mobile bicycle mechanics','Arrange an on site fleet service enquiry'],
 ['Wildlife photography guides','Discuss a private bird photography outing'],
 ['Museum exhibit fabricators','Enquire about making a small exhibition display'],
 ['Theatre costume workshops','Discuss a costume commission for a production'],
 ['Acoustic treatment installers','Request a studio listening room consultation'],
 ['Community language tutors','Ask about a small group conversation course'],
 ['Urban garden designers','Discuss a balcony planting design'],
 ['Food styling studios','Enquire about styling a cookbook photo shoot'],
 ['Independent furniture restorers','Discuss restoring a damaged wooden chair'],
 ['Dance rehearsal studios','Enquire about space for a choreography project'],
 ['Small sailing schools','Discuss an introductory lesson for a private group'],
 ['Specialist garment alteration studios','Ask about fitting and altering an occasion outfit'],
 ['Family history book designers','Discuss a printed family story commission'],
 ['Mobile ceramics workshop hosts','Enquire about a hands on team workshop'],
 ['Podcast editing studios','Discuss editing a short interview series'],
 ['Nature interpretation guides','Enquire about a guided coastal discovery walk'],
 ['Independent lighting designers','Discuss lighting for a small exhibition'],
 ['Community printmaking studios','Ask about a beginner linocut workshop'],
 ['Specialist garden tool repair shops','Discuss restoring a set of worn hand tools']
].map(([audience,purpose])=>({audience,purpose}));
export function nextDesignDirection(existing,sequence,rejections=[]){
 const used=[...existing,...rejections];
 for(let i=0;i<DIRECTIONS.length;i++){const d=DIRECTIONS[(sequence+i)%DIRECTIONS.length];if(!used.some(b=>similarity(d.audience,b.audience)>.8&&similarity(d.purpose,b.purpose)>.65))return d;}
 return {instruction:'Choose a new business service and enquiry purpose outside all existing and rejected identities. No renamed variants.',sector:['education','hospitality','repair services','creative production','outdoor recreation','specialist manufacturing'][sequence%6]};
}
export function promptIdentities(existing,direction,sequence){
 if(existing.length<=180)return existing;
 const ranked=[...existing].sort((a,b)=>similarity(b.audience,direction.audience||'')-similarity(a.audience,direction.audience||''));
 const selected=new Set(ranked.slice(0,60));for(let i=0;selected.size<180&&i<existing.length;i++)selected.add(existing[(sequence*97+i)%existing.length]);return [...selected];
}
export function plannerPrompt(seed,existing,sequence,rejections=[]){
 const direction=nextDesignDirection(existing,sequence,rejections);
 return `Design ONE original static MARKETING WEBSITE for a business, concept ${sequence}. Return only JSON. This is a product design task, not web research. The verified paid comparator is ${JSON.stringify({niche:seed.niche,title:seed.priceEvidence?.[0]?.title})}. Design a useful narrower audience and a specific EMAIL ENQUIRY purpose within that broad market. Never just rename a prior kit. Different products must solve different customer needs with substantially different service sections and worksheet questions. No invented evidence, testimonials, sales, certifications or guarantees. No regulated advice. This is NOT a software tool, proposal generator, dashboard, form system or application assistant. Never mention permits, government, toolkits, exports, uploads, automatic actions, tracking, calculators or transactions. The only working action is an EMAIL LINK; the worksheet is a separate blank Markdown document. Visitors read about the BUSINESS'S SERVICES and email the business to discuss needs. Write visitor-facing business copy, not a description of our website product. Follow the design direction below. Do not default to ceramicists, vintage crafts or a renamed earlier audience. No code, HTML, URLs or copied source prose. Section heading under 70 characters; card headings under 60 characters.
Existing audience / purpose pairs to avoid: ${JSON.stringify(promptIdentities(existing,direction,sequence).map(b=>[b.audience,b.purpose]))}.
Design direction for this attempt: ${JSON.stringify(direction)}. Build genuinely useful sections for this service. The direction is a product hypothesis, not researched demand. If it does not fit the comparator market, propose a different unused audience.
Recent rejected attempts (do not repeat): ${JSON.stringify(rejections.slice(-12))}.
JSON fields: audience (short specific customer group), purpose (short distinct job this website solves), brand (original short name), headline, intro, section, cards (3 pairs of heading and useful audience-specific text), steps (3 short strings), questions (3 concrete enquiry questions), sample (short hypothetical example). Keep total under 650 words. No extra fields.`;
}
