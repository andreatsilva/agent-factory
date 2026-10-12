// Original core stays fixed; modular bays extend its world without moving workers.
import {FACTORY_MODULES} from './factory-modules.mjs';
export const CORE={x:0,y:0,w:1280,h:720};
export const SIDES=['north','east','south','west'];
export const BAY_TYPES=['workshop','storage','servers'];
export const emptyLayout=()=>({revision:0,bays:[]});
export function bayGeometry(side,index){
 const center={north:{x:640,y:-170-index*300},south:{x:640,y:890+index*300},east:{x:1490+index*400,y:350},west:{x:-210-index*400,y:350}}[side];
 return {x:center.x-160,y:center.y-105,w:320,h:210};
}
export function bayRooms(layout){return layout.bays.map(b=>{const module=FACTORY_MODULES.find(m=>m.id===b.moduleId);return {...b,...bayGeometry(b.side,b.index),name:module?.name||(b.crewDepartment?b.crewDepartment.toUpperCase()+' CREW DOCK '+(b.crewIndex+1):null)||b.type.toUpperCase()+' BAY '+(b.index+1)+' / '+b.side.toUpperCase(),accent:module?.accent||'#c3bc83',desc:module?.desc||(b.crewDepartment?'Twelve crew berths for '+b.crewDepartment:null)||'Expansion space · unassigned to a production workflow',stations:module?.stations,expansion:true};});}
export function layoutBounds(layout){const rs=[CORE,...bayRooms(layout)];const x=Math.min(...rs.map(r=>r.x-20)),y=Math.min(...rs.map(r=>r.y-25));return {x,y,w:Math.max(...rs.map(r=>r.x+r.w+20))-x,h:Math.max(...rs.map(r=>r.y+r.h+20))-y};}
export function nextBay(layout,side,type){if(!SIDES.includes(side)||!BAY_TYPES.includes(type))throw Error('Choose a valid side and bay type');const index=layout.bays.filter(b=>b.side===side).length;if(index>=8)throw Error('This expansion arm is full (8 bays)');return {id:`bay-${side}-${index}`,side,type,index};}
export function changeLayout(layout,change){
 if(change.revision!==layout.revision)throw Object.assign(Error('Layout changed in another window. Reload the layout and try again.'),{status:409});
 let bays=[...layout.bays];
 if(change.action==='add')bays.push(nextBay(layout,change.side,change.type));
 else if(change.action==='remove'){
  const bay=bays.find(b=>b.id===change.id);if(!bay)throw Error('Bay not found');
  if(bay.moduleId||bay.crewDepartment)throw Error('Active production modules and crew docks cannot be removed as empty bays');
  if(bays.some(b=>b.side===bay.side&&b.index>bay.index))throw Error('Remove the outermost bay first to keep corridors connected');
  bays=bays.filter(b=>b.id!==bay.id);
 }else throw Error('Unknown layout action');
 return {revision:layout.revision+1,bays};
}
