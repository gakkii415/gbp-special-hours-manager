import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function harness(){
 const elements=new Map(),requests=[],navigation=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'2026-11-03',dataset:{},open:false,close(){this.open=false;},showModal(){this.open=true;},setAttribute(){},replaceChildren(){},append(){}});return elements.get(id);};
 const c=vm.createContext({URL,URLSearchParams,console,Intl,Date,structuredClone,location:{search:'',replace:url=>navigation.push(url)},document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>({src:'logo.png'}),createElement:()=>({})},window:{google:{script:{run:{}}},__GBP_BACKEND_STORE_ID__:'tattoo',open:url=>navigation.push(url)}});
 const stores=fs.readFileSync('stores.js','utf8').replaceAll('export ','');
 const hours=fs.readFileSync('hours.js','utf8').replaceAll('export ','');
 const app=fs.readFileSync('app.js','utf8').replace(/^import .*\nimport .*\n/,'').split('\nconst parts=')[0];
 vm.runInContext(stores+'\n'+hours+'\n'+app+"\ncontrols=()=>{};loadDay=()=>{};renderList=()=>{};updateStoreTabs=()=>{};viewMonth='2026-11';",c);
 c.rpc=(name,arg)=>new Promise((resolve,reject)=>requests.push({name,arg,resolve,reject}));
 const reply=(i,periods=[])=>requests[i].resolve({...requests[i].arg,periods});
 return {c,requests,navigation,element,reply,run:code=>vm.runInContext(code,c)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const closed=date=>{const [year,month,day]=date.split('-').map(Number);return {startDate:{year,month,day},closed:true};};
async function ready(){const h=harness();h.c.refresh();h.reply(0);await tick();h.reply(1);await tick();return h;}
test('スパの全期間を表示してからタトゥーを先読みする',async()=>{
 const h=harness();h.c.refresh();assert.equal(h.requests.length,1);
 assert.deepEqual({...h.requests[0].arg},{store:'spa'});
 h.reply(0,[closed('2026-05-04'),closed('2028-11-04')]);await tick();
 assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);assert.equal(h.run('periods.length'),2);
 assert.deepEqual({...h.requests[1].arg},{store:'tattoo'});
 h.c.selectStore('tattoo');assert.equal(h.requests.length,2);h.reply(1);await tick();h.c.selectStore('spa');
 assert.equal(h.run('loaded'),true);assert.equal(h.run('periods.length'),2);assert.equal(h.requests.length,2);
});
test('月移動も遠い日付への直接移動も通信せず全期間データを再利用する',async()=>{
 const h=harness();h.c.refresh();h.reply(0,[closed('2028-01-09')]);await tick();h.reply(1);await tick();
 h.c.changeMonth(1);h.c.changeMonth(-1);h.c.changeMonth(-1);h.c.editDate('2028-01-09');await tick();
 assert.equal(h.run('viewMonth'),'2028-01');assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);
 assert.equal(h.run('rowsForDay().length'),1);assert.equal(h.requests.length,2);
});
test('空の全期間データも取得済みとして店舗切替で再利用する',async()=>{
 const h=await ready();h.c.selectStore('tattoo');h.c.selectStore('spa');await tick();
 assert.equal(h.requests.length,2);assert.equal(h.run('loaded'),true);assert.equal(h.run('periods.length'),0);
});
test('遅れて到着した旧店舗の応答で切替先を上書きしない',async()=>{
 const h=harness();h.c.refresh();h.c.selectStore('tattoo');
 h.reply(1,[closed('2026-11-05')]);await tick();h.reply(0,[closed('2026-11-04')]);await tick();
 assert.equal(h.run('activeStoreId'),'tattoo');assert.equal(h.run('dateKey(periods[0].startDate)'),'2026-11-05');assert.equal(h.navigation.length,0);
});
test('先読み失敗はスパ表示や編集を妨げず切替時に再試行する',async()=>{
 const h=harness();h.c.refresh();h.reply(0);await tick();let redraws=0;h.c.renderList=()=>redraws++;
 h.c.notice('入力中の状態');h.requests[1].reject(Error('temporary'));await tick();
 assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);assert.equal(h.element('notice').textContent,'入力中の状態');assert.equal(redraws,0);
 h.c.selectStore('tattoo');assert.equal(h.requests.length,3);h.reply(2);await tick();assert.equal(h.run('loaded'),true);
});
test('別店舗、不正データ、期間限定の応答を全期間データとして受け入れない',async()=>{
 for(const value of [{store:'tattoo',periods:[]},{store:'spa'}, {store:'spa',periods:[],startMonth:'2026-11',endMonth:'2026-11'}]){
  const h=harness();h.c.refresh();h.requests[0].resolve(value);await tick();
  assert.equal(h.run('loaded'),false);assert.equal(h.run("storeSnapshots.has('spa')"),false);assert.equal(h.requests.length,1);
 }
});
test('明示再読込より古い応答はキャッシュを巻き戻さない',async()=>{
 const h=harness();h.c.refresh();h.c.refresh();h.reply(1,[closed('2026-11-04')]);await tick();h.reply(0);await tick();h.reply(2);await tick();
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.run('periods.length'),1);
});
test('保存確認は表示月外も含めた全期間の署名を使用する',async()=>{
 const h=harness();h.c.refresh();h.reply(0,[closed('2026-11-03'),closed('2028-11-03')]);await tick();h.reply(1);await tick();h.c.confirmChange(true);
 const pending=h.run('pending');assert.equal(pending.store,'spa');assert.equal(pending.baseline,h.run('signature(periods)'));
 assert.equal(Object.hasOwn(pending,'startMonth'),false);assert.equal(Object.hasOwn(pending,'endMonth'),false);
 h.c.apply();assert.deepEqual({...h.requests[2].arg}, {...pending});
});
test('保存中は店舗切替を防ぎ保存成功で全期間キャッシュを更新する',async()=>{
 const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',baseline:'[]',replacements:[]};");
 h.c.apply();h.c.selectStore('tattoo');assert.equal(h.run('activeStoreId'),'spa');
 h.reply(2,[closed('2026-11-04'),closed('2028-11-04')]);await tick();assert.equal(h.run('saving'),false);
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.run('periods.length'),2);assert.equal(h.requests.length,3);
});
test('結果不明の保存後は古いキャッシュを破棄する',async()=>{
 const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',baseline:'[]',replacements:[]};");
 h.c.apply();h.requests[2].reject(Error('保存結果を確認できません。'));await tick();assert.equal(h.run('loaded'),false);
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.requests[3].arg.store,'spa');assert.equal(h.run('loaded'),false);
});
test('店舗切替は確認を破棄し異なる店舗の確認では保存しない',async()=>{
 const h=await ready();h.run("pending={store:'spa'};");h.element('confirm-dialog').open=true;h.c.selectStore('tattoo');
 assert.equal(h.run('pending'),null);assert.equal(h.element('confirm-dialog').open,false);
 h.run("pending={store:'spa'};");await h.c.apply();assert.equal(h.requests.filter(r=>r.name==='saveSpecialHours').length,0);
});
test('旧店舗読込が保存中に終わっても保存ロックを解除しない',async()=>{
 const h=harness();h.c.refresh();h.c.selectStore('tattoo');h.reply(1);await tick();
 h.run("pending={store:'tattoo',date:'2026-11-04',baseline:'[]',replacements:[]};");h.c.apply();h.reply(0);await tick();
 assert.equal(h.run('busy'),true);assert.equal(h.run('saving'),true);
 h.run("pending={store:'tattoo'};");await h.c.apply();assert.equal(h.requests.filter(r=>r.name==='saveSpecialHours').length,1);h.reply(2);await tick();assert.equal(h.run('busy'),false);
});
test('保存応答が不正または部分取得なら再読込まで保存を止める',async()=>{
 for(const value of [{store:'spa'},{store:'tattoo',periods:[]},{store:'spa',periods:[],startMonth:'2026-11',endMonth:'2026-11'}]){
  const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',baseline:'[]',replacements:[]};");h.c.apply();h.requests[2].resolve(value);await tick();
  assert.equal(h.run('loaded'),false);assert.equal(h.run("storeSnapshots.has('spa')"),false);
 }
});
test('明示再読み込みの失敗は取得済みの店舗でも通知する',async()=>{
 const h=await ready();h.c.refresh();h.requests[2].reject(Error('再取得失敗'));await tick();
 assert.equal(h.element('notice').textContent,'再取得失敗');assert.equal(h.run('loaded'),false);
});
