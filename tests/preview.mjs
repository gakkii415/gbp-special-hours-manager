// Browser fixture: use the actual application files with an isolated in-memory GAS adapter.
const frame=document.querySelector('iframe');
const base=new URL('../',location.href).href;
const adapter=()=>{
 const database={tattoo:[],spa:[]};
 const report=(name,store)=>parent.postMessage({fixture:true,name,store},new URL(document.baseURI).origin);
 function runner(ok,fail){return {
  withSuccessHandler(fn){return runner(fn,fail);},withFailureHandler(fn){return runner(ok,fn);},
  getSpecialHours({store}){report('read',store);setTimeout(()=>ok({store,periods:structuredClone(database[store])}),store==='spa'?450:100);},
  saveSpecialHours(change){report('save',change.store);setTimeout(()=>{database[change.store]=change.replacements;ok({store:change.store,periods:structuredClone(database[change.store])});},100);}
 };}
 window.google={script:{run:runner()}};
 window.__GBP_BACKEND_STORE_ID__='tattoo';
};
const revision=Date.now();
let html=await fetch(new URL('index.html?preview='+revision,base),{cache:'no-store'}).then(r=>r.text());
html=html.replace('href="style.css"','href="style.css?preview='+revision+'"').replace(/src="app\.js\?v=(\d+)"/,'src="app.js?v=$1&preview='+revision+'"');
html=html.replace('<head>','<head><base href="'+base+'"><script>('+adapter.toString()+')();<\/script>');
frame.srcdoc=html;
const counts={};
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||!e.data?.fixture)return;const k=e.data.store+' '+e.data.name;counts[k]=(counts[k]||0)+1;document.querySelector('#requests').textContent=JSON.stringify(counts);});
document.querySelector('#size').onchange=e=>{const [w,h]=e.target.value.split(',');frame.width=w;frame.height=h;};
document.querySelector('#verify').onclick=()=>{
 const d=frame.contentDocument,win=frame.contentWindow,actions=d.querySelector('.editor>.actions'),rect=el=>el.getBoundingClientRect(),a=rect(actions);
 const visibleInputs=[...d.querySelectorAll('#intervals select')].filter(el=>el.getClientRects().length);
 const overlap=visibleInputs.some(el=>{const b=rect(el);return a.top<b.bottom&&a.bottom>b.top&&a.left<b.right&&a.right>b.left;});
 const tab=d.querySelector('.store-tab'),t=rect(tab);
 const issues=[];
 if(overlap)issues.push('FAIL: 保存ボタンと時刻入力の重なり');
 if(win.getComputedStyle(actions).position!=='static')issues.push('FAIL: 保存ボタンが通常フロー外');
 if(d.documentElement.scrollWidth>win.innerWidth)issues.push('FAIL: 横にはみ出し');
 if(t.height<72)issues.push('FAIL: タブのタップ範囲不足');
 const output={status:issues.length?'FAIL':'PASS',issues,viewport:[win.innerWidth,win.innerHeight],saveTop:a.top,inputBottom:visibleInputs.length?Math.max(...visibleInputs.map(el=>rect(el).bottom)):null,tabSize:[t.width,t.height],store:d.querySelector('[data-store][aria-selected="true"]').dataset.store};
 document.querySelector('#results').textContent=JSON.stringify(output,null,2);
};
