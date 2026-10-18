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
 h.c.apply();const save=h.requests.find(r=>r.name==='saveSpecialHours');assert.equal(save.arg.store,'spa');
 const count=h.requests.length;h.c.selectStore('tattoo');assert.equal(h.run('activeStoreId'),'spa');assert.equal(h.requests.length,count);
 save.resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('saving'),false);
});
test('別店舗の応答と古い確認内容では保存できない',async()=>{
 const h=harness();h.c.refresh();h.requests[0].resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('loaded'),false);
 h.run("pending={store:'spa'};loaded=true;");await h.c.apply();assert.equal(h.requests.filter(r=>r.name==='saveSpecialHours').length,0);
});

test('先読みを共用し読込済み店舗へは通信なしで即時切替する',async()=>{
 const h=harness();h.c.refresh();assert.equal(h.requests.length,2);
 h.c.selectStore('spa');assert.equal(h.requests.length,2);
 h.requests.find(r=>r.arg.store==='spa').resolve({store:'spa',periods:[{closed:true}]});
 h.requests.find(r=>r.arg.store==='tattoo').resolve({store:'tattoo',periods:[{closed:false}]});await tick();
 h.c.selectStore('tattoo');assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);assert.equal(h.run('periods[0].closed'),false);
 h.c.selectStore('spa');assert.equal(h.run('periods[0].closed'),true);assert.equal(h.requests.length,2);
});
test('再読み込みは最新情報を取得し保存成功後は更新済み情報へ即時切替する',async()=>{
 const h=harness();h.c.refresh();
 h.requests[0].resolve({store:'tattoo',periods:[]});h.requests[1].resolve({store:'spa',periods:[]});await tick();
 h.c.refresh();assert.equal(h.requests.length,3);h.requests[2].resolve({store:'tattoo',periods:[{closed:true}]});await tick();
 h.run("pending={store:'tattoo',date:'2026-11-01',baseline:'[]',replacements:[]};");h.c.apply();
 h.requests[3].resolve({store:'tattoo',periods:[{closed:false}]});await tick();
 h.c.selectStore('spa');h.c.selectStore('tattoo');assert.equal(h.run('periods[0].closed'),false);assert.equal(h.requests.length,4);
});
test('結果不明の保存後は古い保持情報を使わず再取得する',async()=>{
 const h=harness();h.c.refresh();h.requests[0].resolve({store:'tattoo',periods:[]});h.requests[1].resolve({store:'spa',periods:[]});await tick();
 h.run("pending={store:'tattoo',date:'2026-11-01',baseline:'[]',replacements:[]};");h.c.apply();
 h.requests[2].reject(Error('保存結果を確認できません。'));await tick();assert.equal(h.run('loaded'),false);
 h.c.selectStore('spa');h.c.selectStore('tattoo');assert.equal(h.run('loaded'),false);assert.equal(h.requests[3].arg.store,'tattoo');
 h.requests[3].resolve({store:'tattoo',periods:[{closed:true}]});await tick();assert.equal(h.run('loaded'),true);assert.equal(h.run('periods[0].closed'),true);
});
test('明示再読込より古い先読み応答は保持情報を巻き戻さない',async()=>{
 const h=harness();h.c.refresh();h.c.selectStore('spa');h.c.refresh();
 h.requests[2].resolve({store:'spa',periods:[{closed:true}]});await tick();
 h.requests[1].resolve({store:'spa',periods:[{closed:false}]});h.requests[0].resolve({store:'tattoo',periods:[]});await tick();
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.run('periods[0].closed'),true);
});
