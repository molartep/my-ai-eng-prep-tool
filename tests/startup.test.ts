import {it,expect} from 'vitest';
import {spawn,spawnSync,type ChildProcess} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
it('initializes a fresh database and preserves offline answers after a full server restart',async()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'ai-prep-restart-')),url=`file:${path.join(folder,'fresh.db')}`;
 const endpoint='http://127.0.0.1:3031';let child:ChildProcess|undefined,logs='';
 async function launch(){
  child=spawn(process.execPath,['scripts/start.mjs'],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:url,PORT:'3031'},stdio:['ignore','pipe','pipe']});child.stdout?.on('data',d=>{logs+=d;});child.stderr?.on('data',d=>{logs+=d;});
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(logs);try{const r=await fetch(endpoint+'/api/health');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Startup timeout: '+logs);
 }
 async function stop(){if(child&&child.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}child=undefined;}
 try{
  await launch();const r=await fetch(endpoint+'/api/attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:'agent-loop-explain',answer:'The runtime decides, acts, observes and enforces termination.'})});expect(r.ok).toBe(true);const result=await r.json();await stop();await launch();const saved=await(await fetch(endpoint+'/api/questions/agent-loop-explain')).json();expect(saved.attempts.some((a:{id:string})=>a.id===result.attempt.id)).toBe(true);const source=await(await fetch(endpoint+'/')).text();expect(source).not.toMatch(/https?:\/\//);const dashboard=await(await fetch(endpoint+'/api/dashboard')).json();expect(dashboard.answered).toBe(1);expect((await(await fetch(endpoint+'/api/ollama')).json()).disabled).toBe(true);await stop();
  const restoreRoot=path.join(folder,'restore-project');mkdirSync(path.join(restoreRoot,'scripts'),{recursive:true});mkdirSync(path.join(restoreRoot,'data'),{recursive:true});copyFileSync('scripts/restore-sqlite.mjs',path.join(restoreRoot,'scripts/restore-sqlite.mjs'));copyFileSync(path.join(folder,'fresh.db'),path.join(restoreRoot,'data/study.db'));const restore=spawnSync(process.execPath,[path.join(restoreRoot,'scripts/restore-sqlite.mjs'),path.join(folder,'fresh.db'),'--replace'],{encoding:'utf8'});expect(restore.status,restore.stderr).toBe(0);expect(readdirSync(path.join(restoreRoot,'data/backups')).some(f=>f.startsWith('before-restore-'))).toBe(true);
 }finally{await stop();rmSync(folder,{recursive:true,force:true});}
},60000);
