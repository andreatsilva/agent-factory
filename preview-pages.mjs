// Preview the exact Pages artifact under its repository subpath, without a backend on this origin.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_FILES} from './build-pages.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'pages-dist'),files=new Set([...PUBLIC_FILES,'viewer-config.mjs']),prefix='/agent-factory/';
http.createServer((req,res)=>{
 if(req.url==='/'){res.writeHead(302,{Location:prefix});return res.end();}
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=pathname===prefix?'index.html':pathname.startsWith(prefix)?pathname.slice(prefix.length):'';
 if(req.method!=='GET'||!files.has(file)){res.writeHead(404);return res.end('Not found');}
 try{res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':file.endsWith('.mjs')?'text/javascript':'text/html','Cache-Control':'no-store'});res.end(readFileSync(join(root,file)));}catch{res.writeHead(503);res.end('Run npm run build:pages first');}
}).listen(8790,'127.0.0.1',()=>console.log('Static Pages preview: http://127.0.0.1:8790/agent-factory/'));
