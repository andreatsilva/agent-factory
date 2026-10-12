import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkers,positionAt,assignWorker,freezeWorker,resumeWorker,assignmentFor,viewWorker} from '../workers.mjs';
test('workers walk to real destinations, arrive and do not loop',()=>{
 const w=initialWorkers(0).find(w=>w.id==='RL-01');const task=assignWorker(w,'research','WORKING','job-1',0,0);
 const start=positionAt(task,0),middle=positionAt(task,2000),end=positionAt(task,60000);
 assert.notDeepEqual(start,middle);assert.equal(middle.moving,true);assert.equal(end.moving,false);assert.equal(viewWorker(task,60000).current_room,'research');
 assert.deepEqual(end,positionAt(task,120000));assert.equal(assignmentFor(w,'research'),'research');
 const idle=assignWorker(task,'neo','IDLE',null,0,60000);assert.equal(positionAt(idle,61000).moving,true);
});
test('STOP freezes exact in-flight position; START resumes remaining route without teleporting',()=>{
 const task=assignWorker(initialWorkers(0)[0],'website','WORKING','job-1',30,0);const paused=freezeWorker(task,2100);
 assert.equal(paused.state,'STOPPED');assert.deepEqual(positionAt(paused,2100),positionAt(paused,900000));
 const resumed=resumeWorker(paused,10000);assert.equal(positionAt(resumed,10000).x,paused.x);assert.equal(positionAt(resumed,10000).y,paused.y);assert.equal(positionAt(resumed,11000).moving,true);assert.equal(positionAt(resumed,90000).moving,false);
});
test('progress updates do not restart paths and QA routes to Quality Control',()=>{
 const qa=initialWorkers(0).find(w=>w.id==='WC-05');assert.equal(assignmentFor(qa,'quality'),'quality');
 const task=assignWorker(qa,'quality','WORKING','job',0,0);const update=assignWorker(task,'quality','WORKING','job',50,1000);assert.equal(update.started_at,0);assert.equal(update.progress,50);assert.deepEqual(update.route,task.route);
});
