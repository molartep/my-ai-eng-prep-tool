// Original authored rows are expanded into maintainable, validated JSON. No network access.
import { readFileSync,writeFileSync } from 'node:fs';
import {enrich} from './enrich-content';
import { contentSchema, type Article, type Question } from '../shared/schema';
const categories=[
 ['fundamentals','LLM Fundamentals','Understand the models behind the applications.'],['failures','LLM Limitations & Failure Modes','Recognize plausible mistakes and build guardrails.'],['rag','Retrieval-Augmented Generation','Turn documents into grounded answers.'],['rag-evaluation','RAG Evaluation & Metrics','Separate retrieval quality from answer quality.'],['agents','AI Agents','Design bounded reasoning and action loops.'],['durable','Long-Running Agents','Persist, recover, cancel, and control execution.'],['tools','Tool & Function Calling','Connect model proposals to safe runtime actions.'],['mcp','MCP & Agent Skills','Understand capability protocols and reusable instructions.'],['frameworks','LangChain & LangGraph','Choose abstractions for stateful orchestration.'],['evaluations','AI System Evaluation','Measure behavior, calibrate judges, and catch regressions.'],['production','Production AI Engineering','Build observable, secure, reliable AI systems.'],['design','System Design Interviews','Defend an architecture through constraints and failures.']
].map(([id,title,description],position)=>({id,title,description,position}));
const refRows=[
 ['repo','AI Engineering from Scratch','Rohit Ghumare','https://github.com/rohitg00/ai-engineering-from-scratch'],
 ['hf','Hugging Face LLM Course','Hugging Face','https://huggingface.co/learn/llm-course/chapter1/1'],
 ['generation','Text generation','Hugging Face','https://huggingface.co/docs/transformers/main/en/llm_tutorial'],
 ['lost','Lost in the Middle','Liu et al.','https://arxiv.org/abs/2307.03172'],
 ['rag-paper','Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks','Lewis et al.','https://arxiv.org/abs/2005.11401'],
 ['hybrid','Hybrid search overview','Microsoft Learn','https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview'],
 ['ragas','Ragas: Automated Evaluation of Retrieval Augmented Generation','Es et al.','https://arxiv.org/abs/2309.15217'],
 ['llama-eval','Evaluating','LlamaIndex','https://developers.llamaindex.ai/python/framework/module_guides/evaluating/'],
 ['agents-doc','Building effective agents','Anthropic','https://www.anthropic.com/engineering/building-effective-agents'],
 ['tools-doc','Function calling','OpenAI','https://developers.openai.com/api/docs/guides/function-calling'],
 ['structured','Structured model outputs','OpenAI','https://developers.openai.com/api/docs/guides/structured-outputs'],
 ['mcp-doc','Architecture overview (2026-07-28)','Model Context Protocol','https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture'],
 ['mcp-security','Security best practices (2026-07-28)','Model Context Protocol','https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices'],
 ['skills','Agent Skills specification','Agent Skills','https://agentskills.io/specification'],
 ['graph','LangGraph overview','LangChain','https://docs.langchain.com/oss/python/langgraph/overview'],
 ['persistence','Persistence','LangChain','https://docs.langchain.com/oss/python/langgraph/persistence'],
 ['chain','LangChain overview','LangChain','https://docs.langchain.com/oss/python/langchain/overview'],
 ['eval-doc','Evaluation best practices','OpenAI','https://developers.openai.com/api/docs/guides/evaluation-best-practices'],
 ['google-eval','Gen AI evaluation overview','Google Cloud','https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-overview'],
 ['ir','Evaluation of ranked retrieval results','Manning, Raghavan and Schütze (Stanford)','https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html'],
 ['ollama','Generate a chat message','Ollama','https://docs.ollama.com/api/chat']
];
const sources=refRows.map(([id,title,publisher,url])=>({id,title,publisher,url,retrievedAt:'2026-10-09',...(id==='repo'?{repositoryPath:'README.md',commit:'b6a7a1706bae08c6b4e90f2d9dbfd997f8cbe126'}:{})}));
const refs:Record<string,string[]>={fundamentals:['hf','generation'],failures:['lost','agents-doc'],rag:['rag-paper','hybrid'], 'rag-evaluation':['ragas','llama-eval'],agents:['agents-doc'],durable:['persistence','agents-doc'],tools:['tools-doc','structured'],mcp:['mcp-doc','mcp-security','skills'],frameworks:['graph','chain','persistence'],evaluations:['eval-doc','google-eval'],production:['eval-doc','agents-doc'],design:['agents-doc','persistence','eval-doc']};
const slug=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
const articles:Article[]=[],questions:Question[]=[];
let categoryId='';
for(const line of readFileSync('content/concepts.txt','utf8').split('\n')){
 if(!line.trim())continue;if(line.startsWith('# ')){categoryId=line.slice(2);continue;}
 const [title,definition,how,limitation,scenario,solution,wrong]=line.split('|');
 if(!wrong)throw Error('Malformed authored concept: '+title);
 const id=slug(title), localRefs=[...refs[categoryId]];
 if(categoryId==='rag-evaluation'&&['Precision@K and Recall@K','Hit Rate@K','Mean Reciprocal Rank','Mean Average Precision','NDCG'].includes(title))localRefs.push('ir');
 if(categoryId==='fundamentals'&&title==='Structured outputs')localRefs.push('structured');
 if(categoryId==='failures'&&title==='Prompt injection')localRefs.push('mcp-security');
 const quickAnswer=definition+' '+how;
 const strong=quickAnswer+' For example: '+scenario+' '+solution;
 const expert=strong+' The architectural constraint is: '+limitation+' In production, define an observable success condition and test the failing case separately from happy-path averages.';
 const mistakes=wrong.split('~');
 const comparison=title.includes('versus')?[{aspect:'Primary distinction',first:definition.split(';')[0],second:definition.split(';').slice(1).join(';')||how},{aspect:'Mechanism',first:how,second:limitation}]:undefined;
 const a:Article={id,categoryId,title,difficulty:categoryId==='fundamentals'?'Beginner':['durable','production','evaluations'].includes(categoryId)?'Senior':'Intermediate',definition,explanation:definition+' '+how+' '+limitation,howItWorks:how,whyItMatters:solution,whenToUse:'Use this concept when investigating the following application requirement or failure: '+scenario,whenNotToUse:'Avoid relying on this concept as a complete solution when its limitations apply: '+limitation,advantages:[solution],limitations:[limitation],misconceptions:mistakes,example:scenario+' '+solution,quickAnswer,deepDive:expert,related:[],sources:localRefs,...(comparison?{comparison}:{})};
 articles.push(a);
 const base={topicId:id,difficulty:a.difficulty,referenceAnswer:strong,quickAnswer,answers:{core:definition,strong,expert},keyConcepts:[definition,how,limitation],rubric:[{criterion:'State the defining distinction: '+definition,weight:25},{criterion:'Explain the mechanism: '+how,weight:30},{criterion:'Resolve the concrete failure: '+solution,weight:25},{criterion:'Discuss the limitation: '+limitation,weight:20}],commonMistakes:mistakes,sources:localRefs,followUp:'What observation would distinguish a failure of '+title.toLowerCase()+' from a failure of the surrounding application?',flashcard:false};
 const correctSlot=questions.length%4;
 const texts=[...mistakes];texts.splice(correctSlot,0,solution);
 questions.push({...base,id:id+'-mcq',type:'multiple_choice',prompt:scenario+' Choose the best engineering response.',options:texts.map((text,i)=>({id:String(i),text,explanation:i===correctSlot?'This addresses the observed failure. '+how:'This claim confuses the mechanism or its guarantees. '+definition+' '+limitation})),correct:[String(correctSlot)]});
 questions.push({...base,id:id+'-explain',type:'explain',prompt:'Explain '+title.toLowerCase()+' to an interviewer. Use a concrete example and distinguish its guarantees from its limitations.',flashcard:true});
 questions.push({...base,id:id+'-scenario',difficulty:'Senior',type:'scenario',prompt:scenario,referenceAnswer:solution+' '+limitation,answers:{core:solution,strong:solution+' '+how,expert:expert}});
 if(articles.length%9===0){
  const n=articles.length/9;
  if(n%3===1)questions.push({...base,id:id+'-compare',type:'compare',prompt:'Compare the mechanism of '+title.toLowerCase()+' with the misconception “'+mistakes[0]+'”. Explain how the difference changes an engineering decision.',comparison:comparison||[{aspect:'Valid approach',first:how,second:mistakes[0]},{aspect:'Operational consequence',first:solution,second:limitation}]});
  else if(n%3===2)questions.push({...base,id:id+'-tf',type:'true_false',prompt:'True or false: '+mistakes[0],options:[{id:'true',text:'True',explanation:'Incorrect. '+definition+' '+limitation},{id:'false',text:'False',explanation:'Correct. '+how}],correct:['false']});
  else questions.push({...base,id:id+'-select',type:'multiple_select',prompt:'Which statements correctly describe '+title.toLowerCase()+'? Select all that apply.',options:[{id:'definition',text:definition,explanation:'Correct defining property.'},{id:'mechanism',text:how,explanation:'Correct mechanism.'},{id:'wrong1',text:mistakes[0],explanation:limitation},{id:'wrong2',text:mistakes[1],explanation:solution}],correct:['definition','mechanism']});
 }
}
for(const line of readFileSync('content/designs.txt','utf8').trim().split('\n')){
 const [title,requirements,architecture,tradeoffs,failures,evaluation]=line.split('|'),id=slug(title), sources=refs.design;
 const design={Requirements:requirements,'Proposed architecture':architecture,'Key components':architecture.split(' → '),'Data flow':architecture,'Design decisions':tradeoffs,'Trade-offs':tradeoffs,'Failure scenarios':failures,'Scalability considerations':'Bound queues and concurrency, partition by access scope, batch independent work and measure tail latency. Keep stable IDs and reconcile duplicate work.', 'Evaluation strategy':evaluation,'Interview follow-up questions':['Which stage is most likely to violate your SLO?','What happens after a crash between an external effect and a checkpoint?','How do you verify permissions and budget limits?']};
 const strong=requirements+' '+architecture+' '+tradeoffs,expert=strong+' Failure cases: '+failures+' Evaluation: '+evaluation;
 const a:Article={id,categoryId:'design',title,difficulty:'Advanced',definition:requirements,explanation:strong,howItWorks:architecture,whyItMatters:evaluation,whenToUse:requirements,whenNotToUse:tradeoffs,advantages:['Explicit boundaries make quality and failures measurable.'],limitations:[tradeoffs],misconceptions:['A model-only solution is sufficient without runtime controls.'],example:failures,quickAnswer:strong,deepDive:expert,related:[],sources,design};articles.push(a);
 const base={topicId:id,difficulty:'Advanced' as const,referenceAnswer:expert,quickAnswer:strong,answers:{core:requirements+' '+architecture,strong,expert},keyConcepts:[requirements,architecture,tradeoffs,evaluation],rubric:[{criterion:'Clarify requirements: '+requirements,weight:20},{criterion:'Connect architecture and data flow: '+architecture,weight:30},{criterion:'Handle failures: '+failures,weight:25},{criterion:'Evaluate trade-offs and outcomes: '+evaluation,weight:25}],commonMistakes:['Ignore authorization, persistence or evaluation boundaries.'],sources,followUp:'How would you validate '+title.toLowerCase()+' during a dependency outage?',flashcard:false};
 questions.push({...base,id:id+'-architecture',type:'architecture',prompt:'Design a '+title.toLowerCase()+'. Requirements: '+requirements+' Explain components, data flow, failure recovery, scaling, trade-offs and evaluation.'});
 const distractors=['Rely only on a confident model response without observing task outcomes.','Assume all components succeed and omit recovery boundaries.','Use only one aggregate score and ignore access controls and failure slices.'];
 const slot=questions.length%4,opts=[...distractors];opts.splice(slot,0,evaluation);
 questions.push({...base,id:id+'-mcq',type:'multiple_choice',prompt:'For a '+title.toLowerCase()+', which validation strategy addresses the stated requirements?',options:opts.map((text,i)=>({id:String(i),text,explanation:i===slot?'Correct. '+failures:'Insufficient for these requirements. '+evaluation})),correct:[String(slot)]});
 questions.push({...base,id:id+'-short',type:'short_answer',flashcard:true,prompt:'In a '+title.toLowerCase()+', how would you detect and recover from this failure: '+failures});
}
const comparisons:Record<string,Array<{aspect:string,first:string,second:string}>>={
 'agent-versus-workflow':[{aspect:'Control flow',first:'Workflow: the application defines the sequence and branches.',second:'Agent: the model selects some actions from the goal and observations.'},{aspect:'Best fit',first:'Workflow: stable requirements and predictable operations.',second:'Agent: tasks requiring adaptive exploration under bounded uncertainty.'},{aspect:'Production design',first:'Workflow: deterministic validation, permissions and routing.',second:'Agent: bounded autonomy within those deterministic controls.'}],
 'langchain-versus-langgraph':[{aspect:'Abstraction',first:'LangChain: model integrations and higher-level application/agent interfaces.',second:'LangGraph: explicit state, nodes, edges and orchestration.'},{aspect:'Persistence',first:'Choose an appropriate high-level agent abstraction when its defaults fit.',second:'Use explicit graph persistence and interrupts when custom lifecycle control matters.'},{aspect:'Choice',first:'Faster assembly of common patterns.',second:'More control over recovery and graph transitions, with more design responsibility.'}],
 'mcp-versus-function-calling':[{aspect:'Layer',first:'Function calling: a model proposes a tool name and arguments.',second:'MCP: a host/client communicates with a capability server.'},{aspect:'Execution',first:'Application runtime validates, authorizes and dispatches the request.',second:'A client can route that request to a discovered MCP tool.'},{aspect:'Other primitives',first:'Tool requests need no MCP transport.',second:'MCP also exposes resources and reusable prompts.'}],
 'skills-versus-tools-versus-mcp':[{aspect:'Responsibility',first:'Skills: reusable instructions explaining how to do a task.',second:'Tools: runtime operations. MCP: standardized exchange with capability servers.'},{aspect:'Discovery',first:'Skills: brief metadata, then progressive loading of instructions and resources.',second:'Tools/MCP: capability schemas and descriptions that a host can expose to a model.'},{aspect:'Authorization',first:'Skill activation never grants operating-system or tool permissions.',second:'Hosts and runtimes enforce consent, scopes and validation before execution.'},{aspect:'Example',first:'A review skill describes how to inspect changes and verify tests.',second:'An execution tool runs the tests; MCP may expose that capability to the host.'}],
 'retry-versus-resume':[{aspect:'Unit',first:'Retry: repeat a particular operation.',second:'Resume: continue the workflow from saved state.'},{aspect:'Successful prior work',first:'Retry policy belongs to the failing step.',second:'Completed step results are loaded from durable storage.'},{aspect:'Uncertain side effect',first:'Reuse stable IDs and reconcile before retrying.',second:'Checkpoints alone cannot prove whether a remote operation completed.'}]
};
for(const [id,comparison] of Object.entries(comparisons)){const a=articles.find(a=>a.id===id);if(a)a.comparison=comparison;for(const q of questions.filter(q=>q.topicId===id))q.comparison=comparison;}
for(const a of articles)a.related=articles.filter(x=>x.categoryId===a.categoryId&&x.id!==a.id).slice(0,3).map(x=>x.id);
enrich(articles,questions);
const content=contentSchema.parse({categories,sources,articles,questions});
writeFileSync('content/knowledge-base.json',JSON.stringify(content,null,2)+'\n');
writeFileSync('content/references.json',JSON.stringify(sources,null,2)+'\n');
console.log(JSON.stringify({articles:articles.length,questions:questions.length,flashcards:questions.filter(q=>q.flashcard).length,byType:questions.reduce((n,q)=>({...n,[q.type]:(n[q.type]||0)+1}),{} as Record<string,number>)}));
