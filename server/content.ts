import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { PrismaClient, Prisma } from '@prisma/client';
import { contentSchema,type Article,type Question } from '../shared/schema';
export function loadContent(file=path.resolve('content/knowledge-base.json')){return contentSchema.parse(JSON.parse(readFileSync(file,'utf8')));}
export const article=(t:{article:string}):Article=>JSON.parse(t.article);
export const question=(q:{content:string}):Question=>JSON.parse(q.content);
export async function importContent(db:PrismaClient,raw:unknown){
 const c=contentSchema.parse(raw); // Validate entire update before touching persistent state.
 const oldTopics=await db.topic.findMany(),oldQuestions=await db.question.findMany();
 const changes={newArticles:c.articles.filter(a=>!oldTopics.some(t=>t.id===a.id)).length,changedArticles:c.articles.filter(a=>oldTopics.some(t=>t.id===a.id&&t.article!==JSON.stringify(a))).length,newQuestions:c.questions.filter(q=>!oldQuestions.some(x=>x.id===q.id)).length,changedQuestions:c.questions.filter(q=>oldQuestions.some(x=>x.id===q.id&&x.content!==JSON.stringify(q))).length};
 await db.$transaction(async tx=>{
  for(const x of c.categories)await tx.category.upsert({where:{id:x.id},create:x,update:x});
  for(const x of c.sources)await tx.source.upsert({where:{id:x.id},create:x,update:x});
  for(const a of c.articles){const x={id:a.id,title:a.title,categoryId:a.categoryId,difficulty:a.difficulty,article:JSON.stringify(a)};await tx.topic.upsert({where:{id:a.id},create:x,update:x});}
  for(const q of c.questions){const x={id:q.id,topicId:q.topicId,type:q.type,difficulty:q.difficulty,prompt:q.prompt,content:JSON.stringify(q)};await tx.question.upsert({where:{id:q.id},create:x,update:x});}
  await tx.$executeRawUnsafe('CREATE VIRTUAL TABLE IF NOT EXISTS SearchIndex USING fts5(id UNINDEXED, kind UNINDEXED, title, body, categoryId UNINDEXED, difficulty UNINDEXED)');
  await tx.$executeRawUnsafe('DELETE FROM SearchIndex');
  // Index all persisted content, including older content retained to preserve history.
  for(const t of await tx.topic.findMany())await tx.$executeRawUnsafe('INSERT INTO SearchIndex(id,kind,title,body,categoryId,difficulty) VALUES(?,?,?,?,?,?)',t.id,'article',t.title,t.article,t.categoryId,t.difficulty);
  for(const q of await tx.question.findMany({include:{topic:true}}))await tx.$executeRawUnsafe('INSERT INTO SearchIndex(id,kind,title,body,categoryId,difficulty) VALUES(?,?,?,?,?,?)',q.id,'question',q.prompt,q.content,q.topic.categoryId,q.difficulty);
 },{timeout:60000});
 return changes;
}
export async function search(db:PrismaClient,term:string,category='',difficulty=''){
 const words=term.match(/[\p{L}\p{N}]+/gu)?.slice(0,12)||[];
 if(!words.length)return [];
 const match=words.map(w=>'"'+w+'"*').join(' AND ');
 return db.$queryRawUnsafe<Array<{id:string;kind:string;title:string;categoryId:string;difficulty:string}>>('SELECT id,kind,title,categoryId,difficulty FROM SearchIndex WHERE SearchIndex MATCH ? AND (? = \'\' OR categoryId = ?) AND (? = \'\' OR difficulty = ?) ORDER BY rank LIMIT 60',match,category,category,difficulty,difficulty);
}
export type Tx=Prisma.TransactionClient;
