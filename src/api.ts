export async function api<T=any>(url:string,options:RequestInit={}):Promise<T>{
 const r=await fetch('/api'+url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;
}
export const post=<T=any>(url:string,body:unknown)=>api<T>(url,{method:'POST',body:JSON.stringify(body)});
export const patch=<T=any>(url:string,body:unknown)=>api<T>(url,{method:'PATCH',body:JSON.stringify(body)});
