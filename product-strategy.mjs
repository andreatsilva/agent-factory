import {createHash} from 'node:crypto';

// A capability is only offered when its renderer actually implements it.
export const APP_PROFILES={
 kanban:{label:'Project Board',query:'kanban project board app',match:/kanban|project board/i,features:['Create and edit task cards','Move work between three stages','Filter cards and save the board offline'],difference:'A compact offline board with editable task details, search and portable JSON export.'},
 expense:{label:'Expense Tracker',query:'personal expense tracker app',match:/expense|spending|budget tracker/i,features:['Record dated expenses and categories','Filter entries by category','Calculate totals and export saved records'],difference:'A private offline expense log with category filters, totals and portable JSON export; no bank connection.'},
 habit:{label:'Habit Tracker',query:'daily habit tracker app',match:/habit track|habit app/i,features:['Create daily habits','Record completion for each day','Review a rolling seven-day history'],difference:'An offline seven-day habit calendar with editable habits and portable JSON export; no account.'},
 notes:{label:'Notes Workspace',query:'notes app search tags',match:/note.?taking|notes app|note app/i,features:['Create and edit notes','Tag and search notes','Save notes locally and export a backup'],difference:'A lightweight offline searchable notes library with tags and portable JSON export.'},
 focus:{label:'Focus Checklist',query:'pomodoro timer checklist app',match:/pomodoro|focus timer|checklist/i,features:['Editable workflow checklist','25-minute start/pause/reset timer','Saved checklist progress'],difference:'An offline checklist and focus timer for a specific workflow.'}
};
export const WEBSITE_STYLES={
 editorial:{label:'Editorial',ink:'#182d2a',paper:'#f5f1e7',accent:'#be4b30',difference:'An editorial service guide with oversized typography, numbered service rows and a compact enquiry worksheet.'},
 bento:{label:'Bento',ink:'#202337',paper:'#f3f4fa',accent:'#5954cf',difference:'A modular service overview with a split hero, asymmetric cards and concise expandable FAQs.'},
 midnight:{label:'Midnight',ink:'#e5f4f0',paper:'#101b24',accent:'#9bddb3',difference:'A dark portfolio presentation with a full-width hero and a visual process timeline.'},
 atelier:{label:'Atelier',ink:'#412f36',paper:'#fbf0ed',accent:'#a13f60',difference:'A warm studio presentation with a framed hero, offset service cards and a prominent project story.'}
};
export const canonicalSource=value=>{try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return '';return u.hostname.replace(/^www\./,'').toLowerCase()+u.pathname.replace(/\/+$/,'').toLowerCase();}catch{return '';}};
export const sourceIdentity=(kind,variant,url)=>createHash('sha256').update([kind,variant,canonicalSource(url)].join('|')).digest('hex').slice(0,24);
export function appProfile(id){return APP_PROFILES[id]||APP_PROFILES.focus;}
export function independentStudioBrief(brief,spec,id){
 if(spec?.type!=='app')return brief;
 const label={kanban:'Board',expense:'Ledger',habit:'Habits',notes:'Notes',focus:'Focus'}[spec.variant]||'Studio';
 // Reference brands and capability claims cannot leak through a model response.
 // The source is credited separately; the shipped product carries our identity.
 return {...brief,brand:'NEO '+label+' '+id.slice(-4).toUpperCase(),headline:appProfile(spec.variant).label+' — your offline workspace',description:appProfile(spec.variant).difference,items:appProfile(spec.variant).features};
}
export function assertWebsiteSourceScope(brief,seed){
 const category=seed.niche||'',copy=[brief.headline,brief.intro,...brief.cards.flat()].join(' ');
 if(/restaurant|guest accommodation|hotel|resort/i.test(category)){
  if(/(?:help|serve|for|support|assist).{0,45}(?:owners|operators|hoteliers)|sourcing|procurement|operational (?:growth|efficien)|harvest validation/i.test(copy))throw Error('Website drifted from the researched business into owner consultancy');
  if(/restaurant/i.test(category)&&!/\b(menu|dishes|dining|tables?|chef)\b/i.test(copy))throw Error('Restaurant reference needs dining content');
  if(/guest accommodation|hotel|resort/i.test(category)&&!/\b(rooms?|suites?|guests?|stay)\b/i.test(copy))throw Error('Accommodation reference needs guest and room content');
 }
 const sourceTitle=(seed.priceEvidence?.[0]?.title||'').toLowerCase();
 if(brief.brand.length>=4&&sourceTitle.includes(brief.brand.toLowerCase()))throw Error('Reference brand reused; create an independent identity');
}
export function validateResearchSpec(raw){
 if(!raw)return null;
 if(raw.version!==2||!['website','app','thumbnail','image','logo'].includes(raw.type))throw Error('Invalid research specification');
 if(raw.type==='website'&&!WEBSITE_STYLES[raw.variant]||raw.type==='app'&&!APP_PROFILES[raw.variant])throw Error('Unsupported researched capability');
 const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max||/[<>]/.test(v))throw Error('Invalid research text');return v;};
 if(!canonicalSource(raw.source?.url)||raw.source.url.length>600)throw Error('Invalid research source');
 if(!Array.isArray(raw.features)||!raw.features.length||raw.features.length>8)throw Error('Invalid researched features');
 return {version:2,type:raw.type,variant:text(raw.variant,40),source:{url:raw.source.url,title:text(raw.source.title,180)},features:raw.features.map(v=>text(v,220)),difference:text(raw.difference,600),limitations:text(raw.limitations,600),evidenceStatus:['SEARCH_EXCERPTS','OBSERVED_LISTING'].includes(raw.evidenceStatus)?raw.evidenceStatus:'SEARCH_EXCERPTS',identity:sourceIdentity(raw.type,raw.variant,raw.source.url)};
}
export function websiteDirection(seed,existing=[]){
 const url=seed.priceEvidence?.[0]?.url||seed.evidence?.[0]?.url,source=canonicalSource(url);
 if(!source)return null;
 // An old renamed variant counts too. Stop mining one comparator indefinitely.
 const used=existing.filter(o=>canonicalSource(o.researchSpec?.source?.url||o.priceEvidence?.[0]?.url||o.evidence?.[0]?.url)===source&&o.websiteBrief&&o.researchSpec?.version===2);
 if(used.length>=2)return null;
 const counts=Object.fromEntries(Object.keys(WEBSITE_STYLES).map(k=>[k,existing.filter(o=>o.websiteBrief?.designStyle===k).length]));
 const style=Object.keys(WEBSITE_STYLES).filter(k=>!used.some(o=>o.websiteBrief?.designStyle===k)).sort((a,b)=>counts[a]-counts[b])[0];
 return {version:2,type:'website',variant:style,source:{url,title:seed.priceEvidence?.[0]?.title||seed.title},audience:seed.niche,features:['Responsive service presentation','Project story and process','Email enquiry and editable worksheet'],difference:WEBSITE_STYLES[style].difference,identity:sourceIdentity('website',style,url),evidenceStatus:'OBSERVED_LISTING',limitations:'Independent implementation of a narrower static website. No source code, paid files, artwork or branding copied; no booking, payment or server features.'};
}
