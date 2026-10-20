import type {PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {contentSchema} from '../shared/schema';
import {article,question,importContent} from './content';
const id=z.string().min(1).max(200),date=z.coerce.date();
const score=z.number().min(0).max(100).nullable();
const serialized=z.string().max(200000).refine(s=>{try{JSON.parse(s);return true;}catch{return false;}},'Expected serialized JSON');
const jsonAs=(schema:z.ZodTypeAny)=>z.string().max(200000).refine(s=>{try{return schema.safeParse(JSON.parse(s)).success;}catch{return false;}},'Invalid structured backup field');
export const backupSchema=z.object({version:z.literal(1),exportedAt:date,content:contentSchema,progress:z.array(z.object({topicId:id,status:z.enum(['not_started','learning','understood','mastered']),bookmarked:z.boolean(),note:z.string(),updatedAt:date})),reviews:z.array(z.object({questionId:id,dueAt:date,interval:z.number().int().min(0),ease:z.number().min(1.3),repetitions:z.number().int().min(0),lapses:z.number().int().min(0),bookmarked:z.boolean(),difficult:z.boolean(),note:z.string()})),sessions:z.array(z.object({id,mode:z.enum(['quiz','interview','daily','weak']),title:z.string(),config:serialized,questionIds:serialized,currentIndex:z.number().int().min(0),status:z.enum(['active','completed']),duration:z.number().int().min(0),createdAt:date,completedAt:date.nullable()})),attempts:z.array(z.object({id,questionId:id,sessionId:id.nullable(),answer:jsonAs(z.union([z.string(),z.array(z.string())])),score,method:z.enum(['deterministic','self','ollama','ungraded','skipped']),feedback:jsonAs(z.record(z.unknown())),confidence:z.number().int().min(1).max(4).nullable(),covered:jsonAs(z.array(z.string())),duration:z.number().int().min(0),createdAt:date})),events:z.array(z.object({id,questionId:id,rating:z.enum(['again','hard','good','easy']),createdAt:date})),preferences:serialized.refine(s=>{let p;try{p=JSON.parse(s);}catch{return false;}return typeof p==='object'&&p!==null&&(!p.theme||['dark','light'].includes(p.theme))&&(!p.model||typeof p.model==='string')&&(p.ollamaEnabled===undefined||typeof p.ollamaEnabled==='boolean')&&(p.dailyGoal===undefined||(Number.isInteger(p.dailyGoal)&&p.dailyGoal>=1&&p.dailyGoal<=100));},'Invalid preferences')}).superRefine((b,c)=>{
 const topics=new Set(b.content.articles.map(x=>x.id)),questions=new Set(b.content.questions.map(x=>x.id)),sessions=new Set(b.sessions.map(x=>x.id));
 for(const key of ['progress','reviews','sessions','attempts','events'] as const){const ids=b[key].map(x=>'id' in x?x.id:'topicId' in x?x.topicId:x.questionId);if(new Set(ids).size!==ids.length)c.addIssue({code:'custom',message:`Duplicate backup ${key}`});}
 if(b.progress.some(x=>!topics.has(x.topicId))||b.reviews.some(x=>!questions.has(x.questionId))||b.events.some(x=>!questions.has(x.questionId))||b.attempts.some(x=>!questions.has(x.questionId)||(x.sessionId&&!sessions.has(x.sessionId))))c.addIssue({code:'custom',message:'Broken backup references'});
 for(const s of b.sessions){const ids=JSON.parse(s.questionIds);if(!Array.isArray(ids)||ids.some((x:unknown)=>typeof x!=='string'||!questions.has(x))||s.currentIndex>ids.length)c.addIssue({code:'custom',message:'Invalid session question list'});}
});
export async function exportBackup(db:PrismaClient){
 return db.$transaction(async tx=>({version:1,exportedAt:new Date().toISOString(),content:{categories:await tx.category.findMany(),sources:(await tx.source.findMany()).map(s=>({...s,repositoryPath:s.repositoryPath||undefined,commit:s.commit||undefined})),articles:(await tx.topic.findMany()).map(article),questions:(await tx.question.findMany()).map(question)},progress:await tx.topicProgress.findMany(),reviews:await tx.review.findMany(),sessions:await tx.session.findMany(),attempts:await tx.attempt.findMany(),events:await tx.reviewEvent.findMany(),preferences:(await tx.preference.findUnique({where:{id:'user'}}))?.value||'{}'}));
}
export async function restoreBackup(db:PrismaClient,raw:unknown){
 const b=backupSchema.parse(raw);
 // Existing content is preserved when IDs collide; imported progress never overwrites local records.
 const current=await exportBackup(db);
 const merge=<T extends {id:string}>(local:T[],incoming:T[])=>[...local,...incoming.filter(x=>!local.some(y=>y.id===x.id))];
 await importContent(db,{categories:merge(current.content.categories,b.content.categories),sources:merge(current.content.sources,b.content.sources),articles:merge(current.content.articles,b.content.articles),questions:merge(current.content.questions,b.content.questions)});
 const added=await db.$transaction(async tx=>{
 let count=0;
 for(const x of b.progress)if(!await tx.topicProgress.findUnique({where:{topicId:x.topicId}})){await tx.topicProgress.create({data:x});count++;}
 for(const x of b.reviews)if(!await tx.review.findUnique({where:{questionId:x.questionId}})){await tx.review.create({data:x});count++;}
 for(const x of b.sessions)if(!await tx.session.findUnique({where:{id:x.id}})){await tx.session.create({data:x});count++;}
 for(const x of b.attempts)if(!await tx.attempt.findUnique({where:{id:x.id}})){await tx.attempt.create({data:x});count++;}
 for(const x of b.events)if(!await tx.reviewEvent.findUnique({where:{id:x.id}})){await tx.reviewEvent.create({data:x});count++;}
 if(!await tx.preference.findUnique({where:{id:'user'}}))await tx.preference.create({data:{id:'user',value:b.preferences}});
 return count;
 },{timeout:60000});
 return {added,message:'Imported missing records. Existing progress, content and preferences were preserved.'};
}
