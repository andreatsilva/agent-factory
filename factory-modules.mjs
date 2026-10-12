// Register each new production section here: layout, crew and navigation share this record.
export const MAX_AGENTS=124;
export const FACTORY_MODULES=[
 {id:'sales',name:'SALES OPS',type:'workshop',side:'east',accent:'#d1ab62',desc:'Brief intake → scoped proposals → local delivery handoff',stations:['INTAKE','PROPOSAL','DELIVERY'],crew:[['SO-01','Brief coordinator'],['SO-02','Proposal / delivery']],capability:'sales-workflow'},
 {id:'thumbnails',name:'THUMBNAIL CREATORS',type:'workshop',side:'east',accent:'#78acb4',desc:'Approved brief → two PNG compositions → visual review',stations:['LAYOUT','PNG RENDER','QA OUT'],crew:[['TC-01','Thumbnail compositor'],['TC-02','Thumbnail packager']],capability:'thumbnail-render'}
];
export const DEPARTMENTS={website:{name:'Website Creator',capability:'website-template'},research:{name:'Research Lab',capability:'research'},quality:{name:'Quality Control',capability:'html-qa'},product:{name:'Product Factory',capability:'listing-package'},...Object.fromEntries(FACTORY_MODULES.map(m=>[m.id,{name:m.name,capability:m.capability}]))};
export function ensureModuleLayout(layout,modules=FACTORY_MODULES){
 const next={...layout,bays:layout.bays.map(b=>({...b}))};let changed=false;
 for(const m of modules){if(next.bays.some(b=>b.moduleId===m.id))continue;
  const side=[m.side,'east','south','west','north'].find(s=>next.bays.filter(b=>b.side===s).length<8);
  if(!side)throw Error('No expansion slot available for '+m.name);
  next.bays.push({id:'module-'+m.id,moduleId:m.id,type:m.type,side,index:next.bays.filter(b=>b.side===side).length});changed=true;
 }
 if(changed)next.revision++;
 return next;
}
