import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function harness(){
 const elements=new Map(),requests=[],navigation=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{dataset:{},open:false,close(){this.open=false;},setAttribute(){},replaceChildren(){},append(){}});return elements.get(id);};
 const c=vm.createContext({URL,URLSearchParams,console,Intl,Date,structuredClone,location:{search:'',replace:url=>navigation.push(url)},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({})},window:{google:{script:{run:{}}},__GBP_BACKEND_STORE_ID__:'tattoo',open:url=>navigation.push(url)}});
 const stores=fs.readFileSync('stores.js','utf8').replaceAll('export ','');
 const app=fs.readFileSync('app.js','utf8').replace(/^import .*\nimport .*\n/,'').split('\nconst parts=')[0];
 vm.runInContext(stores+'\n'+app+"\ncontrols=()=>{};loadDay=()=>{};updateStoreTabs=()=>{};",c);
 c.rpc=(name,arg)=>new Promise((resolve,reject)=>requests.push({name,arg,resolve,reject}));
 return {c,requests,navigation,element,run:code=>vm.runInContext(code,c)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('同一画面で店舗を切替し遅れて到着した旧店舗の情報を破棄する',async()=>{
 const h=harness();h.c.refresh();h.c.selectStore('spa');
 assert.deepEqual(h.requests.map(r=>[r.name,r.arg.store]),[['getSpecialHours','tattoo'],['getSpecialHours','spa']]);
 h.requests[1].resolve({store:'spa',periods:[{closed:true}]});await tick();
 h.requests[0].resolve({store:'tattoo',periods:[{closed:false}]});await tick();
 assert.equal(h.run('activeStoreId'),'spa');assert.equal(h.run('loaded'),true);assert.equal(h.run('periods[0].closed'),true);assert.equal(h.run('busy'),false);assert.equal(h.navigation.length,0);
});
test('店舗切替で保存確認を破棄し保存中は切り替えない',async()=>{
 const h=harness();h.run("pending={store:'tattoo'};loaded=true;");h.element('confirm-dialog').open=true;
 h.c.selectStore('spa');assert.equal(h.run('pending'),null);assert.equal(h.element('confirm-dialog').open,false);
 h.requests[0].resolve({store:'spa',periods:[]});await tick();
 h.run("pending={store:'spa',date:'2026-11-01',baseline:'[]',replacements:[]};");
 h.c.apply();assert.equal(h.requests[1].name,'saveSpecialHours');assert.equal(h.requests[1].arg.store,'spa');
 h.c.selectStore('tattoo');assert.equal(h.run('activeStoreId'),'spa');assert.equal(h.requests.length,2);
 h.requests[1].resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('saving'),false);
});
test('別店舗の応答と古い確認内容では保存できない',async()=>{
 const h=harness();h.c.refresh();h.requests[0].resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('loaded'),false);
 h.run("pending={store:'spa'};loaded=true;");await h.c.apply();assert.equal(h.requests.length,1);
});
