import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function harness(){
 const elements=new Map(),requests=[],navigation=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'2026-11-03',dataset:{},open:false,close(){this.open=false;},setAttribute(){},replaceChildren(){},append(){}});return elements.get(id);};
 const c=vm.createContext({URL,URLSearchParams,console,Intl,Date,structuredClone,location:{search:'',replace:url=>navigation.push(url)},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({})},window:{google:{script:{run:{}}},__GBP_BACKEND_STORE_ID__:'tattoo',open:url=>navigation.push(url)}});
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
test('スパの5ヶ月分を先に表示してからタトゥーを先読みする',async()=>{
 const h=harness();h.c.refresh();assert.equal(h.requests.length,1);
 assert.deepEqual({...h.requests[0].arg},{store:'spa',startMonth:'2026-09',endMonth:'2027-01'});
 h.reply(0,[closed('2026-11-04')]);await tick();
 assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);assert.equal(h.requests[1].arg.store,'tattoo');
 h.c.selectStore('tattoo');assert.equal(h.requests.length,2);
 h.reply(1);await tick();h.c.selectStore('spa');
 assert.equal(h.run('loaded'),true);assert.equal(h.run('periods.length'),1);await tick();assert.equal(h.requests.length,2);
});
test('月送りは新しい端の1ヶ月だけ取得し戻る時は再利用する',async()=>{
 const h=await ready();h.c.changeMonth(1);
 assert.equal(h.run('loaded'),true);assert.equal(h.run('busy'),false);
 assert.deepEqual({...h.requests[2].arg},{store:'spa',startMonth:'2027-02',endMonth:'2027-02'});
 h.reply(2);await tick();assert.equal(h.requests[3].arg.store,'tattoo');h.reply(3);await tick();
 h.c.changeMonth(-1);await tick();assert.equal(h.requests.length,4);
 h.c.changeMonth(-1);assert.equal(h.requests[4].arg.startMonth,'2026-08');assert.equal(h.requests[4].arg.endMonth,'2026-08');
});
test('遠い日付へ移動した時はその月の前後2ヶ月を取得する',async()=>{
 const h=await ready();h.c.editDate('2028-01-09');assert.equal(h.run('loaded'),false);
 assert.deepEqual({...h.requests[2].arg},{store:'spa',startMonth:'2027-11',endMonth:'2028-03'});
 h.reply(2,[closed('2028-01-09')]);await tick();assert.equal(h.run('loaded'),true);assert.equal(h.run('periods.length'),1);
});
test('連続移動では進行中の月を共用し古い応答で表示月を戻さない',async()=>{
 const h=await ready();h.c.changeMonth(1);h.c.changeMonth(1);
 assert.equal(h.requests.length,4);assert.equal(h.requests[2].arg.startMonth,'2027-02');assert.equal(h.requests[3].arg.startMonth,'2027-03');
 h.reply(3);h.reply(2);await tick();assert.equal(h.run('viewMonth'),'2027-01');assert.equal(h.run('loaded'),true);
});
test('遅れて到着した旧店舗の応答で切替先を上書きしない',async()=>{
 const h=harness();h.c.refresh();h.c.selectStore('tattoo');
 h.reply(1,[closed('2026-11-05')]);await tick();h.reply(0,[closed('2026-11-04')]);await tick();
 assert.equal(h.run('activeStoreId'),'tattoo');assert.equal(h.run('dateKey(periods[0].startDate)'),'2026-11-05');assert.equal(h.navigation.length,0);
});
test('先読み失敗はスパ表示を妨げず切替時に再試行する',async()=>{
 const h=harness();h.c.refresh();h.reply(0);await tick();h.requests[1].reject(Error('temporary'));await tick();
 assert.equal(h.run('loaded'),true);assert.equal(h.element('notice').textContent,'');
 h.c.selectStore('tattoo');assert.equal(h.requests.length,3);h.reply(2);await tick();assert.equal(h.run('loaded'),true);
});
test('店舗や範囲が違う応答は未読込のまま保存させない',async()=>{
 const h=harness();h.c.refresh();h.requests[0].resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('loaded'),false);
 h.c.refresh();const r=h.requests.at(-1);r.resolve({...r.arg,store:'tattoo',periods:[]});await tick();assert.equal(h.run('loaded'),false);
});
test('明示再読込より古い応答はキャッシュを巻き戻さない',async()=>{
 const h=harness();h.c.refresh();h.c.refresh();
 h.reply(1,[closed('2026-11-04')]);await tick();h.reply(0);await tick();h.reply(2);await tick();
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.run('periods.length'),1);
});
test('保存中の店舗切替を防ぎ保存成功で対象月のキャッシュを更新する',async()=>{
 const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',startMonth:'2026-11',endMonth:'2026-11',baseline:'[]',replacements:[]};");
 h.c.apply();h.c.selectStore('tattoo');assert.equal(h.run('activeStoreId'),'spa');
 h.reply(2,[closed('2026-11-04')]);await tick();assert.equal(h.run('saving'),false);
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.run('periods.length'),1);await tick();assert.equal(h.requests.length,3);
});
test('結果不明の保存後は古いキャッシュを破棄する',async()=>{
 const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',startMonth:'2026-11',endMonth:'2026-11',baseline:'[]',replacements:[]};");
 h.c.apply();h.requests[2].reject(Error('保存結果を確認できません。'));await tick();assert.equal(h.run('loaded'),false);
 h.c.selectStore('tattoo');h.c.selectStore('spa');assert.equal(h.requests[3].arg.store,'spa');assert.equal(h.run('loaded'),false);
});
test('店舗切替は確認を破棄し異なる店舗の確認では保存しない',async()=>{
 const h=await ready();h.run("pending={store:'spa'};");h.element('confirm-dialog').open=true;h.c.selectStore('tattoo');
 assert.equal(h.run('pending'),null);assert.equal(h.element('confirm-dialog').open,false);
 h.run("pending={store:'spa'};");await h.c.apply();assert.equal(h.requests.filter(r=>r.name==='saveSpecialHours').length,0);
});

test('月の追加読込が保存中に終わっても保存ロックを解除しない',async()=>{
 const h=await ready();h.c.changeMonth(1);
 h.run("pending={store:'spa',date:'2026-12-04',startMonth:'2026-12',endMonth:'2026-12',baseline:'[]',replacements:[]};");
 h.c.apply();h.reply(2);await tick();assert.equal(h.run('busy'),true);assert.equal(h.run('saving'),true);
 h.run("pending={store:'spa'};");await h.c.apply();assert.equal(h.requests.filter(r=>r.name==='saveSpecialHours').length,1);
 h.reply(3);await tick();assert.equal(h.run('busy'),false);
});

test('保存応答の期間が不正なら結果不明として再読込まで保存を止める',async()=>{
 const h=await ready();h.run("pending={store:'spa',date:'2026-11-04',startMonth:'2026-11',endMonth:'2026-11',baseline:'[]',replacements:[]};");h.c.apply();h.requests[2].resolve({store:'spa',periods:[]});await tick();assert.equal(h.run('loaded'),false);assert.equal(h.run("storeSnapshots.has('spa')"),false);
});

test('対応する最終年の12月でもキャッシュ処理が終了する',()=>{const h=harness();h.c.cacheRange('spa',{store:'spa',startMonth:'9999-12',endMonth:'9999-12',periods:[]},'9999-12','9999-12');assert.equal(h.run("storeSnapshots.get('spa').has('9999-12')"),true);});
