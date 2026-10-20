// Offline full restore. Run with the application stopped; replacement is explicitly opt-in.
import {DatabaseSync} from 'node:sqlite';
import {copyFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];
if(!input||!process.argv.includes('--replace')){console.error('Usage: node scripts/restore-sqlite.mjs /path/to/snapshot.db --replace\nStop the application first. A safety snapshot is created before replacement.');process.exit(1);}
try{const r=await fetch('http://127.0.0.1:3000/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok){console.error('Stop the running application before restoring.');process.exit(1);}}catch{}
const source=path.resolve(input),target=path.join(root,'data/study.db');
if(source===target)throw Error('Source must differ from the live database.');
const check=new DatabaseSync(source,{readOnly:true});
if(Object.values(check.prepare('PRAGMA integrity_check').get())[0]!=='ok')throw Error('Snapshot failed integrity checks.');
for(const name of ['Category','Topic','Question','Attempt','Session','Review','Preference','_prisma_migrations'])if(!check.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name))throw Error('Missing application table: '+name);
check.close();mkdirSync(path.join(root,'data/backups'),{recursive:true});
if(existsSync(target)){const db=new DatabaseSync(target),safety=path.join(root,'data/backups',`before-restore-${Date.now()}.db`);db.exec("VACUUM INTO '"+safety.replaceAll("'","''")+"'");db.close();console.log('Safety snapshot: '+safety);}
copyFileSync(source,target);console.log('Restored snapshot. Run npm start to migrate and reindex content.');
