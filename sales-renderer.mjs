import {Worker} from 'node:worker_threads';

// Isolate native drawing from the HTTP server; STOP terminates the worker.
export function renderSalesBrief(brief,signal){
 return new Promise((resolve,reject)=>{
  if(signal.aborted)return reject(signal.reason);
  const worker=new Worker(new URL('./thumbnail-worker.mjs',import.meta.url),{workerData:brief});
  let result,error,received=false;
  const abort=()=>{error=signal.reason;void worker.terminate();};
  const timer=setTimeout(()=>{error=Error('Thumbnail rendering timed out');void worker.terminate();},30000);
  signal.addEventListener('abort',abort,{once:true});
  worker.once('message',value=>{result=value;received=true;});
  worker.once('error',e=>{error=e;});
  worker.once('exit',code=>{
   clearTimeout(timer);signal.removeEventListener('abort',abort);
   if(error||code!==0||!received)reject(error||Error('Thumbnail worker exited without a result'));
   else resolve(result);
  });
 });
}
