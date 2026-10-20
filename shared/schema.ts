import { z } from 'zod';
export const difficulty = z.enum(['Beginner','Intermediate','Senior','Advanced']);
export const types = z.enum(['multiple_choice','multiple_select','true_false','short_answer','explain','compare','scenario','architecture']);
const text = z.string().trim().min(1);
export const sourceSchema = z.object({id:text,title:text,publisher:text,url:z.string().url(),retrievedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),repositoryPath:z.string().optional(),commit:z.string().regex(/^[a-f0-9]{40}$/).optional()});
export const articleSchema = z.object({id:text,categoryId:text,title:text,difficulty,definition:text,explanation:text,howItWorks:text,whyItMatters:text,whenToUse:text,whenNotToUse:text,advantages:z.array(text).min(1),limitations:z.array(text).min(1),misconceptions:z.array(text).min(1),example:text,quickAnswer:text,deepDive:text,related:z.array(text),sources:z.array(text).min(1),comparison:z.array(z.object({aspect:text,first:text,second:text})).optional(),design:z.record(z.union([text,z.array(text)])).optional()});
export const questionSchema = z.object({id:text,topicId:text,difficulty,type:types,prompt:text,referenceAnswer:text,quickAnswer:text,answers:z.object({core:text,strong:text,expert:text}),keyConcepts:z.array(text).min(2),rubric:z.array(z.object({criterion:text,weight:z.number().positive()})).min(2),commonMistakes:z.array(text).min(1),sources:z.array(text).min(1),options:z.array(z.object({id:text,text,explanation:text})).optional(),correct:z.array(text).optional(),comparison:z.array(z.object({aspect:text,first:text,second:text})).optional(),followUp:text,flashcard:z.boolean().default(false)}).superRefine((q,c)=>{
 if(Math.abs(q.rubric.reduce((n,r)=>n+r.weight,0)-100)>.01)c.addIssue({code:'custom',message:'Rubric weights must sum to 100'});
 if(['multiple_choice','multiple_select','true_false'].includes(q.type)){
  const expected=q.type==='true_false'?2:4;
  if(q.options?.length!==expected || !q.correct?.length)c.addIssue({code:'custom',message:'Objective questions require options and correct answers'});
  if(q.type!=='multiple_select'&&q.correct?.length!==1)c.addIssue({code:'custom',message:'One correct answer required'});
  if(new Set(q.options?.map(o=>o.id)).size!==q.options?.length || q.correct?.some(id=>!q.options?.some(o=>o.id===id)))c.addIssue({code:'custom',message:'Invalid option identifiers'});
 }
});
export const contentSchema = z.object({categories:z.array(z.object({id:text,title:text,description:text,position:z.number().int()})),sources:z.array(sourceSchema),articles:z.array(articleSchema),questions:z.array(questionSchema)}).superRefine((data,c)=>{
 for(const key of ['categories','sources','articles','questions'] as const){if(new Set(data[key].map(x=>x.id)).size!==data[key].length)c.addIssue({code:'custom',message:`Duplicate ${key} identifiers`});}
 for(const a of data.articles){if(!data.categories.some(x=>x.id===a.categoryId))c.addIssue({code:'custom',message:`Unknown category: ${a.categoryId}`});if(a.related.some(id=>!data.articles.some(x=>x.id===id)))c.addIssue({code:'custom',message:'Unknown related topic'});}
 for(const q of data.questions)if(!data.articles.some(x=>x.id===q.topicId))c.addIssue({code:'custom',message:`Unknown topic: ${q.topicId}`});
 for(const x of [...data.articles,...data.questions])if(x.sources.some(id=>!data.sources.some(s=>s.id===id)))c.addIssue({code:'custom',message:'Unknown source'});
});
export type Article=z.infer<typeof articleSchema>;
export type Question=z.infer<typeof questionSchema>;
export type Content=z.infer<typeof contentSchema>;
export const aiFeedbackSchema=z.object({score:z.number().min(0).max(100),correct_concepts:z.array(z.string()),missing_concepts:z.array(z.string()),incorrect_statements:z.array(z.string()),feedback:text,improved_answer:text,follow_up_question:text});
