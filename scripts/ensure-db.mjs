import {mkdirSync,openSync,closeSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url=process.env.DATABASE_URL||'file:../data/study.db';
if(!url.startsWith('file:'))throw Error('This application requires a local SQLite file.');
const file=path.resolve(root,'prisma',url.slice(5));
mkdirSync(path.dirname(file),{recursive:true});
if(!existsSync(file))closeSync(openSync(file,'wx'));
