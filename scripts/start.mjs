import {spawnSync,spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
if(!existsSync('dist/server.js')){console.error('Build once with npm run build before starting offline.');process.exit(1);}
const run=(args)=>{const p=spawnSync(process.execPath,args,{stdio:'inherit',env:{...process.env,CHECKPOINT_DISABLE:'1',PRISMA_HIDE_UPDATE_MESSAGE:'1'}});if(p.status!==0)process.exit(p.status||1);};
run(['scripts/ensure-db.mjs']);
run(['node_modules/prisma/build/index.js','migrate','deploy']);
run(['--import','tsx','scripts/import.ts']);
const app=spawn(process.execPath,['dist/server.js'],{stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.kill(signal));
app.on('exit',code=>process.exit(code||0));
