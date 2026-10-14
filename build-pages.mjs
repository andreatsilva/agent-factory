import {mkdirSync,readFileSync,writeFileSync,copyFileSync,readdirSync,statSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateFeedUrl} from './viewer-client.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
export const PUBLIC_FILES=['index.html','camera.mjs','layout.mjs','factory-modules.mjs','factory-art.mjs','scene-art.mjs','worker-sprites.mjs','workers.mjs','neo-avatar.mjs','public-neo-console.mjs','assets/neo-suspended-v1.png','public-snapshot.mjs','viewer-client.mjs','assets/factory-worker-walk-v1.png','assets/factory-worker-work-v1.png'];
export function buildPages({outDir=join(ROOT,'pages-dist'),feedUrl=process.env.FACTORY_FEED_URL||JSON.parse(readFileSync(join(ROOT,'pages-config.json'),'utf8')).feedUrl,allowLoopback=false}={}){
 const url=validateFeedUrl(feedUrl,{allowLoopback});
 const config='export default '+JSON.stringify({publicView:true,feedUrl:url})+';\n';
 // One content version across the import graph prevents cached modules from mixing releases.
 const digest=createHash('sha256').update(config);
 for(const file of PUBLIC_FILES)digest.update(file).update(readFileSync(join(ROOT,file)));
 const version=digest.digest('hex').slice(0,16);
 const versionAssets=text=>text.replace(/(["'])(\.\/[^"'\s]+\.(?:mjs|png))\1/g,(_,quote,path)=>quote+path+'?v='+version+quote).replace(/\r\n/g,'\n');
 // Do not recursively copy the repository. Refuse unexpected output left by another build.
 const allowed=new Set([...PUBLIC_FILES,'viewer-config.mjs','.nojekyll']);
 mkdirSync(outDir,{recursive:true});
 // Remove this explicitly retired generated asset from older local builds.
 rmSync(join(outDir,'neo-face.mjs'),{force:true});
 const inspect=(dir,prefix='')=>{for(const item of readdirSync(dir)){const path=prefix+item;if(statSync(join(dir,item)).isDirectory()){if(path!=='assets')throw Error('Unexpected Pages output directory: '+path);inspect(join(dir,item),path+'/');}else if(!allowed.has(path))throw Error('Unexpected Pages output file: '+path);}};inspect(outDir);
 for(const file of PUBLIC_FILES){mkdirSync(dirname(join(outDir,file)),{recursive:true});if(file.endsWith('.mjs')||file.endsWith('.html'))writeFileSync(join(outDir,file),versionAssets(readFileSync(join(ROOT,file),'utf8')));else copyFileSync(join(ROOT,file),join(outDir,file));}
 const html=readFileSync(join(outDir,'index.html'),'utf8'),script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1],hash=createHash('sha256').update(script).digest('base64');
 const policy=`default-src 'self'; script-src 'self' 'sha256-${hash}'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src ${url?new URL(url).origin:"'none'"}; object-src 'none'; base-uri 'self'; form-action 'none'`;
 writeFileSync(join(outDir,'index.html'),html.replace('<body>','<body class="publicView">').replace('<head>','<head>\n<meta name="referrer" content="no-referrer">\n<meta http-equiv="Content-Security-Policy" content="'+policy+'">'));
 writeFileSync(join(outDir,'viewer-config.mjs'),config);
 writeFileSync(join(outDir,'.nojekyll'),'');return {outDir:resolve(outDir),files:allowed.size,feedConfigured:!!url,version};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(buildPages());
