import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
export const root=process.cwd();
mkdirSync(path.join(root,'data'),{recursive:true});
const configured=process.env.DATABASE_URL;
export const databaseUrl=configured?`file:${path.resolve(root,'prisma',configured.slice(5))}`:`file:${path.join(root,'data/study.db')}`;
export const db=new PrismaClient({datasourceUrl:databaseUrl});
