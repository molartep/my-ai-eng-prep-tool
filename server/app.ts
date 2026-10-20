import express from 'express';
import type {PrismaClient} from '@prisma/client';
import path from 'node:path';
import {existsSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {z,ZodError} from 'zod';
import {article,question,search} from './content';
import {scoreObjective,scheduleReview,mastery,streak,localDay} from '../shared/learning';
import {types,difficulty} from '../shared/schema';
import {detectOllama,evaluate} from './ollama';
import {exportBackup,restoreBackup} from './backup';
const objective=(type:string)=>['multiple_choice','multiple_select','true_false'].includes(type);
export const preferenceSchema=z.object({theme:z.enum(['dark','light']).default('dark'),ollamaEnabled:z.boolean().default(false),model:z.string().max(200).default(''),dailyGoal:z.number().int().min(1).max(100).default(10)});
export function createApp(db:PrismaClient,options:{backupDirectory?:string}={}){
 const app=express();app.disable('x-powered-by');app.use(express.json({limit:'25mb'}));
 app.use((req,res,next)=>{
  const origin=req.headers.origin;
  const allowedOrigins=new Set([`http://127.0.0.1:${process.env.PORT||3000}`,`http://localhost:${process.env.PORT||3000}`,'http://127.0.0.1:5173','http://localhost:5173']);
  if(origin&&!allowedOrigins.has(origin))return res.status(403).json({error:'Local origin required.'});
  const host=req.headers.host?.split(':')[0];if(host&&!['127.0.0.1','localhost'].includes(host))return res.status(403).json({error:'Local host required.'});
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");next();
 });
 async function prefs(){return preferenceSchema.parse(JSON.parse((await db.preference.findUnique({where:{id:'user'}}))?.value||'{}'));}
 async function getQ(id:string){const q=await db.question.findUnique({where:{id}});if(!q)throw Object.assign(Error('Question not found'),{status:404});return question(q);}
 app.get('/api/health',async(_req,res)=>{await db.$queryRaw`SELECT 1`;res.json({ok:true,offline:true});});
 app.get('/api/categories',async(_req,res)=>res.json(await db.category.findMany({orderBy:{position:'asc'},include:{_count:{select:{topics:true}}}})));
 app.get('/api/sources',async(_req,res)=>res.json(await db.source.findMany()));
 app.get('/api/topics',async(req,res)=>{
  const category=typeof req.query.category==='string'?req.query.category:undefined;
  const topics=await db.topic.findMany({where:{categoryId:category},include:{progress:true,questions:{select:{id:true}}},orderBy:{title:'asc'}});
  res.json(topics.map(t=>({id:t.id,title:t.title,categoryId:t.categoryId,difficulty:t.difficulty,definition:article(t).definition,progress:t.progress,questionCount:t.questions.length})));
 });
 app.get('/api/topics/:id',async(req,res)=>{
  const t=await db.topic.findUnique({where:{id:req.params.id},include:{progress:true,questions:true}});if(!t)return res.status(404).json({error:'Topic not found'});
  res.json({...article(t),progress:t.progress,questions:t.questions.map(question)});
 });
 app.patch('/api/topics/:id',async(req,res)=>{
  const data=z.object({status:z.enum(['not_started','learning','understood','mastered']).optional(),bookmarked:z.boolean().optional(),note:z.string().max(20000).optional()}).strict().parse(req.body);
  if(!await db.topic.findUnique({where:{id:req.params.id}}))return res.status(404).json({error:'Topic not found'});
  res.json(await db.topicProgress.upsert({where:{topicId:req.params.id},create:{topicId:req.params.id,...data},update:data}));
 });
 app.get('/api/questions',async(req,res)=>{
  const rows=await db.question.findMany({include:{topic:true,review:true}});
  const category=String(req.query.category||''),topic=String(req.query.topic||''),type=String(req.query.type||''),level=String(req.query.difficulty||'');
  res.json(rows.filter(q=>(!category||q.topic.categoryId===category)&&(!topic||q.topicId===topic)&&(!type||q.type===type)&&(!level||q.difficulty===level)&&(!req.query.bookmarked||q.review?.bookmarked)).map(q=>({...question(q),categoryId:q.topic.categoryId,review:q.review})));
 });
 app.get('/api/questions/:id',async(req,res)=>{const current=await getQ(req.params.id);res.json({...current,relatedQuestions:(await db.question.findMany({where:{topicId:current.topicId,id:{not:current.id}},take:3})).map(question),review:await db.review.findUnique({where:{questionId:req.params.id}}),attempts:await db.attempt.findMany({where:{questionId:req.params.id},orderBy:{createdAt:'desc'},take:30})});});
 app.patch('/api/questions/:id',async(req,res)=>{
  await getQ(req.params.id);const data=z.object({bookmarked:z.boolean().optional(),difficult:z.boolean().optional(),note:z.string().max(20000).optional()}).strict().parse(req.body);
  res.json(await db.review.upsert({where:{questionId:req.params.id},create:{questionId:req.params.id,...data},update:data}));
 });
 app.get('/api/search',async(req,res)=>res.json(await search(db,String(req.query.q||'').slice(0,200),String(req.query.category||''),String(req.query.difficulty||''))));
 app.get('/api/dashboard',async(_req,res)=>{
  const [topics,questions,attempts,sessions,reviews,events]=await Promise.all([db.topic.findMany({include:{progress:true,category:true,questions:{select:{id:true}}}}),db.question.findMany(),db.attempt.findMany({orderBy:{createdAt:'asc'},include:{question:true}}),db.session.findMany({orderBy:{createdAt:'desc'}}),db.review.findMany(),db.reviewEvent.findMany()]);
  const graded=attempts.filter(a=>a.score!==null),totalSeconds=attempts.reduce((n,a)=>n+a.duration,0);
  const cats=(await db.category.findMany({orderBy:{position:'asc'}})).map(c=>{const ts=topics.filter(t=>t.categoryId===c.id),ids=ts.flatMap(t=>t.questions.map(q=>q.id));return {...c,mastery:mastery(attempts.filter(a=>ids.includes(a.questionId)),ids.length),studied:ts.filter(t=>t.progress&&t.progress.status!=='not_started').length,total:ts.length,attempts:attempts.filter(a=>ids.includes(a.questionId)).length};});
  const weak=topics.map(t=>{const relevant=graded.filter(a=>a.question.topicId===t.id),m=mastery(relevant,t.questions.length);return {id:t.id,title:t.title,categoryId:t.categoryId,mastery:m,attempts:relevant.length,average:relevant.length?relevant.reduce((n,a)=>n+(a.score||0),0)/relevant.length:0};}).filter(t=>t.attempts&&t.average<70).sort((a,b)=>a.average-b.average);
  const due=questions.filter(q=>question(q).flashcard&&(!reviews.some(r=>r.questionId===q.id)||reviews.some(r=>r.questionId===q.id&&r.dueAt<=new Date()))).length;
  const daily=Array.from({length:14},(_,i)=>localDay(new Date(Date.now()-(13-i)*86400000))).map(day=>{const a=graded.filter(a=>localDay(a.createdAt)===day);return {day,answered:attempts.filter(a=>localDay(a.createdAt)===day).length,score:a.length?Math.round(a.reduce((n,x)=>n+(x.score||0),0)/a.length):null,reviews:events.filter(e=>localDay(e.createdAt)===day).length};});
  const quizTrend=sessions.filter(s=>s.mode==='quiz'&&s.status==='completed').slice(0,20).reverse().map(s=>{const a=graded.filter(a=>a.sessionId===s.id);return {day:localDay(s.createdAt),score:a.length?Math.round(a.reduce((n,x)=>n+(x.score||0),0)/a.length):0};});
  const interviews=sessions.filter(s=>s.mode==='interview').slice(0,10).map(s=>{const a=graded.filter(a=>a.sessionId===s.id);return {...s,score:a.length?Math.round(a.reduce((n,x)=>n+(x.score||0),0)/a.length):null};});
  res.json({totalTopics:topics.length,studied:topics.filter(t=>t.progress&&t.progress.status!=='not_started').length,mastered:topics.filter(t=>mastery(graded.filter(a=>a.question.topicId===t.id),t.questions.length)>=80).length,answered:attempts.filter(a=>a.method!=='skipped').length,correct:graded.filter(a=>a.score!>=80).length,average:graded.length?Math.round(graded.reduce((n,a)=>n+(a.score||0),0)/graded.length):0,streak:streak(attempts.map(a=>a.createdAt)),totalSeconds,due,categories:cats,weak,daily,quizTrend,interviews,recommendation:weak[0]?`Review ${weak[0].title}. Your graded attempts average ${Math.round(weak[0].average)}%; compare your explanation with the Expert Answer and practice the failure scenario.`:'Start with an agent loop, then practice tool calling and recovery. Your first graded attempts will shape your recommendations.',resume:sessions.find(s=>s.status==='active')||null,confidenceCalibration:[1,2,3,4].map(confidence=>{const a=graded.filter(a=>a.confidence===confidence);return {confidence,count:a.length,average:a.length?Math.round(a.reduce((n,a)=>n+(a.score||0),0)/a.length):null};}),overconfident:graded.filter(a=>a.confidence!==null&&a.confidence>=3&&a.score!<60).slice(-10).reverse().map(a=>({questionId:a.questionId,prompt:a.question.prompt,score:a.score,confidence:a.confidence})),continueTopic:topics.find(t=>t.progress?.status==='learning')?.id||'agent-loop'});
 });
 app.post('/api/attempts',async(req,res)=>{
  const body=z.object({questionId:z.string(),sessionId:z.string().optional(),answer:z.union([z.string().max(30000),z.array(z.string())]),confidence:z.number().int().min(1).max(4).optional(),duration:z.number().int().min(0).max(86400).default(0),skip:z.boolean().default(false)}).parse(req.body);
  const q=await getQ(body.questionId);
  let session;if(body.sessionId){session=await db.session.findUnique({where:{id:body.sessionId}});if(!session||session.status!=='active'||JSON.parse(session.questionIds)[session.currentIndex]!==q.id)return res.status(409).json({error:'This is not the active session question.'});if(session.mode==='interview'&&Date.now()>new Date(session.createdAt).getTime()+JSON.parse(session.config).minutes*60000){await db.session.update({where:{id:session.id},data:{status:'completed',completedAt:new Date()}});return res.status(409).json({error:'The interview time limit has ended. Open the session review.'});}}
  if(!body.skip&&objective(q.type)&&(!Array.isArray(body.answer)||body.answer.some(id=>!q.options?.some(o=>o.id===id))||((q.type!=='multiple_select')&&body.answer.length!==1)))return res.status(400).json({error:'Choose a valid answer.'});
  if(!body.skip&&!objective(q.type)&&(typeof body.answer!=='string'||!body.answer.trim()))return res.status(400).json({error:'Write an answer before revealing the reference.'});
  const attempt=await db.$transaction(async tx=>{
   const a=await tx.attempt.create({data:{id:randomUUID(),questionId:q.id,sessionId:body.sessionId,answer:JSON.stringify(body.answer),confidence:body.confidence,duration:body.duration,score:body.skip?null:objective(q.type)?scoreObjective(q,body.answer as string[]):null,method:body.skip?'skipped':objective(q.type)?'deterministic':'ungraded',feedback:JSON.stringify({message:body.skip?'Skipped without a score.':objective(q.type)?'Exact choice-set scoring.':'Saved. Use the rubric to assess your answer.'})}});
   await tx.topicProgress.upsert({where:{topicId:q.topicId},create:{topicId:q.topicId,status:'learning'},update:{}});
   return a;
  });res.json({attempt,question:q});
 });
 app.patch('/api/attempts/:id',async(req,res)=>{
  const body=z.object({score:z.number().int().min(0).max(5),covered:z.array(z.string()).default([])}).parse(req.body),a=await db.attempt.findUnique({where:{id:req.params.id}});
  if(!a)return res.status(404).json({error:'Attempt not found'});if(['deterministic','skipped'].includes(a.method))return res.status(400).json({error:'This attempt cannot be self-scored'});
  const q=await getQ(a.questionId);if(body.covered.some(c=>!q.keyConcepts.includes(c)))return res.status(400).json({error:'Unknown covered concept'});
  res.json(await db.attempt.update({where:{id:a.id},data:{score:body.score*20,method:'self',covered:JSON.stringify(body.covered),feedback:JSON.stringify({message:'Self-assessment on the 0–5 scale.',missing_concepts:q.keyConcepts.filter(c=>!body.covered.includes(c))})}}));
 });
 app.post('/api/attempts/:id/evaluate',async(req,res)=>{
  const p=await prefs();if(!p.ollamaEnabled)return res.status(400).json({error:'Enable local AI in Settings first.'});
  const a=await db.attempt.findUnique({where:{id:req.params.id}});if(!a)return res.status(404).json({error:'Attempt not found'});
  const q=await getQ(a.questionId);if(objective(q.type)||a.method==='skipped')return res.status(400).json({error:'Use objective scoring for this question.'});
  try{const feedback=await evaluate(q,JSON.parse(a.answer),p.model);res.json(await db.attempt.update({where:{id:a.id},data:{score:feedback.score,method:'ollama',feedback:JSON.stringify(feedback)}}));}catch(e){res.status(503).json({error:'Local evaluation failed. Your answer is saved; use self-assessment. '+(e as Error).message});}
 });
 app.get('/api/flashcards',async(_req,res)=>{const rows=await db.question.findMany({include:{review:true}});res.json(rows.filter(q=>question(q).flashcard&&(!q.review||q.review.dueAt<=new Date())).sort((a,b)=>(a.review?.dueAt.getTime()||0)-(b.review?.dueAt.getTime()||0)).map(q=>({...question(q),review:q.review})));});
 app.post('/api/flashcards/:id/rate',async(req,res)=>{
  const rating=z.enum(['again','hard','good','easy']).parse(req.body.rating),q=await getQ(req.params.id);if(!q.flashcard)return res.status(400).json({error:'Not a flashcard'});
  res.json(await db.$transaction(async tx=>{const r=await tx.review.upsert({where:{questionId:q.id},create:{questionId:q.id},update:{}});const updated=await tx.review.update({where:{questionId:q.id},data:scheduleReview(r,rating)});await tx.reviewEvent.create({data:{id:randomUUID(),questionId:q.id,rating}});return updated;}));
 });
 app.post('/api/sessions',async(req,res)=>{
  const config=z.object({mode:z.enum(['quiz','interview','daily','weak']),category:z.string().default(''),topic:z.string().default(''),difficulty:z.union([difficulty,z.literal('')]).default(''),type:z.union([types,z.literal('')]).default(''),count:z.number().int().min(1).max(50).default(10),minutes:z.number().int().min(1).max(180).default(30)}).parse(req.body);
  const [all,attempts,reviews]=await Promise.all([db.question.findMany({include:{topic:true}}),db.attempt.findMany({orderBy:{createdAt:'desc'}}),db.review.findMany()]);
  let candidates=all.filter(q=>(!config.category||q.topic.categoryId===config.category)&&(!config.topic||q.topicId===config.topic)&&(!config.difficulty||q.difficulty===config.difficulty)&&(!config.type||q.type===config.type)&&(config.mode!=='interview'||!objective(q.type)));
  const priority=(q:typeof all[number])=>{const a=attempts.find(a=>a.questionId===q.id&&a.score!==null),r=reviews.find(r=>r.questionId===q.id);return (r?.difficult?5:0)+(r&&r.dueAt<=new Date()?4:0)+(a&&a.score!<70?3:0)+(!a?2:0);};
  if(config.mode==='weak')candidates=candidates.filter(q=>{const a=attempts.find(a=>a.questionId===q.id&&a.score!==null);return reviews.some(r=>r.questionId===q.id&&r.difficult)||(a&&a.score!<70);});
  candidates=candidates.map(q=>({q,random:Math.random()})).sort((a,b)=>['daily','weak'].includes(config.mode)?priority(b.q)-priority(a.q)||a.random-b.random:a.random-b.random).map(x=>x.q);
  if(!candidates.length)return res.status(400).json({error:'No questions match these filters. Try a broader selection or mark a question as difficult.'});
  const questionIds=candidates.slice(0,config.count).map(q=>q.id);
  res.json(await db.session.create({data:{id:randomUUID(),mode:config.mode,title:config.mode==='interview'?'Technical interview':config.mode==='daily'?'Daily study':config.mode==='weak'?'Weak-area review':'Quick quiz',config:JSON.stringify(config),questionIds:JSON.stringify(questionIds)}}));
 });
 app.get('/api/sessions',async(req,res)=>{const rows=await db.session.findMany({where:req.query.mode?{mode:String(req.query.mode)}:{},orderBy:{createdAt:'desc'},include:{attempts:true}});res.json(rows.map(s=>({...s,questionIds:JSON.parse(s.questionIds),config:JSON.parse(s.config)})));});
 app.get('/api/sessions/:id',async(req,res)=>{
  const s=await db.session.findUnique({where:{id:req.params.id},include:{attempts:{orderBy:{createdAt:'asc'}}}});if(!s)return res.status(404).json({error:'Session not found'});
  const ids:string[]=JSON.parse(s.questionIds),qs=await db.question.findMany({where:{id:{in:ids}}});res.json({...s,config:JSON.parse(s.config),questionIds:ids,questions:ids.map(id=>qs.find(q=>q.id===id)).filter(q=>!!q).map(question)});
 });
 app.post('/api/sessions/:id/advance',async(req,res)=>{
  const body=z.object({expectedIndex:z.number().int().min(0),finish:z.boolean().default(false)}).parse(req.body),s=await db.session.findUnique({where:{id:req.params.id},include:{attempts:true}});if(!s)return res.status(404).json({error:'Session not found'});
  if(s.status!=='active'||s.currentIndex!==body.expectedIndex)return res.status(409).json({error:'Session already advanced. Reload to continue.'});
  const ids=JSON.parse(s.questionIds) as string[];if(!body.finish&&!s.attempts.some(a=>a.questionId===ids[s.currentIndex]))return res.status(400).json({error:'Answer or skip before continuing.'});
  const currentIndex=body.finish?s.currentIndex:s.currentIndex+1,complete=body.finish||currentIndex>=ids.length;
  const update=await db.session.updateMany({where:{id:s.id,currentIndex:body.expectedIndex,status:'active'},data:{currentIndex,status:complete?'completed':'active',completedAt:complete?new Date():null,duration:s.attempts.reduce((n,a)=>n+a.duration,0)}});if(!update.count)return res.status(409).json({error:'Session changed. Reload to continue.'});res.json(await db.session.findUnique({where:{id:s.id}}));
 });
 app.post('/api/sessions/:id/follow-up',async(req,res)=>{
  const s=await db.session.findUnique({where:{id:req.params.id},include:{attempts:{orderBy:{createdAt:'desc'}}}});if(!s||s.mode!=='interview'||s.status!=='active')return res.status(400).json({error:'No active interview'});
  const a=s.attempts[0];if(!a)return res.status(400).json({error:'Answer a question first'});
  const q=await getQ(a.questionId),feedback=JSON.parse(a.feedback),prompt=feedback.follow_up_question||q.followUp,id=randomUUID();
  const follow={...q,id,type:'short_answer' as const,prompt,flashcard:false};
  const ids:string[]=JSON.parse(s.questionIds);if(ids.length>=50)return res.status(400).json({error:'Follow-up limit reached'});
  await db.$transaction(async tx=>{await tx.question.create({data:{id,topicId:q.topicId,type:follow.type,difficulty:q.difficulty,prompt,content:JSON.stringify(follow)}});const topic=await tx.topic.findUniqueOrThrow({where:{id:q.topicId}});await tx.$executeRawUnsafe('INSERT INTO SearchIndex(id,kind,title,body,categoryId,difficulty) VALUES(?,?,?,?,?,?)',id,'question',prompt,JSON.stringify(follow),topic.categoryId,q.difficulty);ids.splice(s.currentIndex+1,0,id);await tx.session.update({where:{id:s.id},data:{questionIds:JSON.stringify(ids)}});});res.json({added:true});
 });
 app.get('/api/preferences',async(_req,res)=>res.json(await prefs()));
 app.patch('/api/preferences',async(req,res)=>{const data=preferenceSchema.parse({...await prefs(),...req.body});await db.preference.upsert({where:{id:'user'},create:{id:'user',value:JSON.stringify(data)},update:{value:JSON.stringify(data)}});res.json(data);});
 app.get('/api/ollama',async(_req,res)=>res.json((await prefs()).ollamaEnabled?await detectOllama():{available:false,models:[],disabled:true}));
 app.get('/api/backup',async(_req,res)=>{res.setHeader('Content-Disposition',`attachment; filename="ai-prep-backup-${localDay(new Date())}.json"`);res.json(await exportBackup(db));});
 app.post('/api/restore',async(req,res)=>res.json(await restoreBackup(db,req.body)));
 app.get('/api/backup/sqlite',async(_req,res)=>{
  const folder=options.backupDirectory||path.resolve('data/backups');mkdirSync(folder,{recursive:true});const file=path.join(folder,`study-${Date.now()}.db`);
  await db.$executeRawUnsafe(`VACUUM INTO '${file.replace(/'/g,"''")}'`);res.download(file);
 });
 const dist=path.resolve('dist');if(existsSync(path.join(dist,'index.html'))){app.use(express.static(dist));app.get('/{*splat}',(req,res)=>req.path.startsWith('/api/')?res.status(404).json({error:'API route not found'}):res.sendFile(path.join(dist,'index.html')));}
 app.use((error:Error&{status?:number},_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error(error.message);res.status(error instanceof ZodError?400:error.status||500).json({error:error instanceof ZodError?error.issues.map(x=>x.message).join('; '):error.status?error.message:'Request failed. Your saved data is preserved.'});});
 return app;
}
