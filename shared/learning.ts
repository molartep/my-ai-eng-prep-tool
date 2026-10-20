import type {Question} from './schema';
export function scoreObjective(q:Question,selected:string[]){
 const choices=new Set(selected),correct=new Set(q.correct||[]);
 return choices.size===correct.size&&[...choices].every(x=>correct.has(x))?100:0;
}
export function scheduleReview(old:{interval:number;ease:number;repetitions:number;lapses:number},rating:'again'|'hard'|'good'|'easy',now=new Date()){
 let {interval,ease,repetitions,lapses}=old;
 if(rating==='again'){repetitions=0;interval=0;lapses++;ease=Math.max(1.3,ease-.2);}
 else{repetitions++;if(rating==='hard'){interval=Math.max(1,Math.round(Math.max(interval,1)*1.2));ease=Math.max(1.3,ease-.15);}else if(rating==='easy'){interval=repetitions===1?4:Math.max(interval+1,Math.round(interval*ease*1.3));ease+=.15;}else interval=repetitions===1?1:repetitions===2?3:Math.max(interval+1,Math.round(interval*ease));}
 return {interval,ease,repetitions,lapses,dueAt:new Date(now.getTime()+(rating==='again'?10*60*1000:interval*86400000))};
}
export function mastery(attempts:Array<{questionId:string;score:number|null;createdAt:Date|string}>,questionCount:number){
 const grouped=new Map<string,number[]>();
 for(const a of [...attempts].sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)))if(a.score!==null){const scores=grouped.get(a.questionId)||[];if(scores.length<3)scores.push(a.score);grouped.set(a.questionId,scores);}
 // Mean of latest three graded attempts per question, unseen questions contribute zero.
 return questionCount?Math.round([...grouped.values()].reduce((s,x)=>s+x.reduce((a,b)=>a+b,0)/x.length,0)/questionCount):0;
}
export function localDay(date:Date|string){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function streak(dates:Array<Date|string>,now=new Date()){
 const days=new Set(dates.map(localDay));let n=0,day=new Date(now);
 if(!days.has(localDay(day)))day=new Date(+day-86400000);
 while(days.has(localDay(day))){n++;day=new Date(+day-86400000);}return n;
}
