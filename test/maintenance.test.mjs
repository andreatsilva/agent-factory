import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createMaintenance} from '../maintenance.mjs';
import {initialWorkers,positionAt,visitStation,freezeWorker,resumeWorker,routeDuration} from '../workers.mjs';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`CREATE TABLE jobs(state TEXT);CREATE TABLE source_cache(expires_at INTEGER);CREATE TABLE products(status TEXT,package BLOB,qa_status TEXT,price_cents INTEGER,artifact TEXT);CREATE TABLE orders(paid INTEGER,token TEXT);CREATE TABLE product_specs(brief TEXT,guide TEXT);CREATE TABLE source_runs(state TEXT);CREATE TABLE research_evidence(data TEXT);CREATE TABLE candidate_decisions(decision TEXT);CREATE TABLE opportunities(neo_score INTEGER);INSERT INTO products VALUES('published',NULL,'passed',2000,'<html>');INSERT INTO source_cache VALUES(1);`);
 let time=100000,running=true,active=null;const records=new Map(initialWorkers(time).map(w=>[w.id,w]));
 const service=createMaintenance({db,workers:()=>[...records.values()],saveWorker:w=>records.set(w.id,w),isRunning:()=>running,activeJob:()=>active,clock:()=>time});
 return {db,records,tick:service.tick,get time(){return time;},advance(ms){time+=ms;service.tick();},setRunning(v){running=v;},setActive(v){active=v;}};
}
test('inspection rounds execute real local checks, stay bounded and do not fabricate production',()=>{
 const f=fixture();try{f.tick();assert.equal([...f.records.values()].filter(w=>w.inspection).length,4);
  for(let i=0;i<160;i++){f.advance(2000);assert.ok([...f.records.values()].filter(w=>w.inspection).length<=4);}
  const rows=f.db.prepare('SELECT * FROM maintenance_checks').all();assert.equal(rows.length,14,'Every worker must get a turn; no starvation');const packageCheck=rows.find(r=>r.worker_id==='PF-01');assert.equal(packageCheck.ok,0);assert.match(packageCheck.detail,/1 missing/);assert.equal(f.db.prepare('SELECT count(*) n FROM products').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM jobs').get().n,0);
 }finally{f.db.close();}
});
test('gaming mode freezes rounds and their dwell timers without losing the next station',()=>{
 const f=fixture();try{f.tick();f.advance(2000);for(const [id,w] of f.records)f.records.set(id,freezeWorker(w,f.time));f.setRunning(false);const saved=JSON.stringify([...f.records.values()]);f.advance(300000);assert.equal(JSON.stringify([...f.records.values()]),saved);assert.equal(f.db.prepare('SELECT count(*) n FROM maintenance_checks').get().n,0);
  for(const [id,w] of f.records)f.records.set(id,resumeWorker(w,f.time));f.setRunning(true);f.advance(2000);assert.ok([...f.records.values()].some(w=>positionAt(w,f.time).moving));
  const w={...initialWorkers(0)[0],station_due:12000};const resume=resumeWorker(freezeWorker(w,10000),70000);assert.equal(resume.station_due,72000);
 }finally{f.db.close();}
});
test('real long-running tasks move between line stations while retaining task identity',()=>{
 const f=fixture();try{const w=f.records.get('WC-04'),work=visitStation(w,'website',0,'WORKING','actual-build',f.time);f.records.set(w.id,work);f.setActive('actual-build');f.advance(routeDuration(work)+1);f.advance(12000);const next=f.records.get(w.id);assert.equal(next.active_task,'actual-build');assert.equal(next.state,'WORKING');assert.equal(next.workstation,1);assert.equal(positionAt(next,f.time+1000).moving,true);assert.equal(next.inspection,undefined);
 }finally{f.db.close();}
});

