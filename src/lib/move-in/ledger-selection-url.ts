'use client';
/** Observe the public History API used by frozen Task 3, preserving Next's implementation. */
export function observeLedgerHistory(changed:(href:string)=>void,canChange:(href:string)=>boolean) {
 const nativePush=history.pushState,nativeReplace=history.replaceState;
 let index=Number(history.state?.ledgerHistoryIndex??0),current=location.pathname+location.search+location.hash,restoring=false;
 nativeReplace.call(history,{...history.state,ledgerHistoryIndex:index},'',current);
 function write(kind:'push'|'replace',data:unknown,unused:string,url?:string|URL|null){
  const target=new URL(url?.toString()??current,location.href),href=target.pathname+target.search+target.hash;
  if(!canChange(href)){
   // Frozen Task 3 updates its local filter state after pushState returns.
   // Restore that state from the unchanged URL after the originating handler.
   queueMicrotask(()=>window.dispatchEvent(new PopStateEvent('popstate',{state:history.state})));
   return;
  }
  if(kind==='push')index++;
  (kind==='push'?nativePush:nativeReplace).call(history,{...(data&&typeof data==='object'?data:{}),ledgerHistoryIndex:index},unused,url);
  current=href;changed(href);
 }
 const push:History['pushState']=(data,unused,url)=>write('push',data,unused,url);
 const replace:History['replaceState']=(data,unused,url)=>write('replace',data,unused,url);
 history.pushState=push;history.replaceState=replace;
 function pop(){
  const target=location.pathname+location.search+location.hash,next=Number(history.state?.ledgerHistoryIndex??index);
  if(restoring){restoring=false;return;}
  if(!canChange(target)){
   if(next!==index){restoring=true;history.go(index-next);}else nativeReplace.call(history,{...history.state,ledgerHistoryIndex:index},'',current);
   return;
  }
  index=next;current=target;changed(target);
 }
 window.addEventListener('popstate',pop);changed(current);
 return()=>{window.removeEventListener('popstate',pop);if(history.pushState===push)history.pushState=nativePush;if(history.replaceState===replace)history.replaceState=nativeReplace;};
}
