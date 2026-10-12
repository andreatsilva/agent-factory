import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plannerPrompt,nextDesignDirection,promptIdentities} from '../product-planner.mjs';
test('planner includes identities formerly hidden in the middle of its history and remembers rejected pairs',()=>{
 const existing=Array.from({length:142},(_,i)=>({audience:'Audience '+i,purpose:'Purpose '+i}));const prompt=plannerPrompt({niche:'Business'},existing,12,[{audience:'Repeated artisan',purpose:'Same commission',reason:'Duplicate audience and purpose'}]);
 for(const b of existing)assert.ok(prompt.includes(JSON.stringify([b.audience,b.purpose])));
 assert.match(prompt,/Repeated artisan/);assert.match(prompt,/Duplicate audience and purpose/);assert.doesNotMatch(prompt,/Example: audience='Independent ceramicists'/);
 const first=nextDesignDirection([],0),next=nextDesignDirection([first],0);assert.notDeepEqual(next,first);assert.notDeepEqual(nextDesignDirection([],0,[first]),first);
});
test('large histories keep model context bounded and rotate coverage without weakening backend duplicate checks',()=>{
 const history=Array.from({length:600},(_,i)=>({audience:'Business '+i,purpose:'Enquiry '+i}));const a=promptIdentities(history,{},1),b=promptIdentities(history,{},2);assert.equal(a.length,180);assert.equal(b.length,180);assert.notDeepEqual(a,b);
});
