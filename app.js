import {dateKey,parseDate,nextDate,clock,signature,makePeriods,replaceDay,describe} from './hours.js';
const $=id=>document.getElementById(id);
let periods=[],loaded=false,busy=false,closed=false,pending=null;
let viewMonth='',todayDate='';
const native=!!window.google?.script?.run;
function notice(text,kind='info'){$('notice').textContent=text;$('notice').hidden=!text;$('notice').dataset.kind=kind;}
function controls(){const ready=native&&loaded&&!busy;$('save').disabled=!ready;$('delete').disabled=!ready||!periods.some(p=>dateKey(p.startDate)===$('date').value);$('refresh').disabled=!native||busy;$('connect').hidden=native;document.querySelectorAll('.editor input,.editor select,.editor button,.schedule-day,.month-nav button').forEach(el=>{if(!['save','delete'].includes(el.id))el.disabled=busy||!native;});}
function rpcError(value,operation){
 const message=String(value?.message||'').replace(/^(?:Error:\s*)+/,'');
 if(/Google API HTTP (401|403)/.test(message))return Error('Googleの認証を確認して、再読み込みしてください。');
 if(/Google API HTTP (429|500|502|503|504)/.test(message))return Error(operation==='saveSpecialHours'?'保存結果を確認できません。再読み込みして登録内容を確認してください。':'Googleが一時的に応答できません。少し待って再試行してください。');
 if(operation==='saveSpecialHours'&&/通信|タイムアウト|接続|ネットワーク/.test(message))return Error('保存結果を確認できません。再読み込みして登録内容を確認してください。');
 if(/^[^\n<>{}]{1,180}$/.test(message)&&/[ぁ-んァ-ヶ一-龯]/.test(message)&&!/https?:|Bearer|token|stack|Error:/i.test(message))return Error(message);
 return Error(operation==='saveSpecialHours'?'保存結果を確認できません。再読み込みして登録内容を確認してください。':'通信を確認して、再読み込みしてください。');
}
function rpc(name,arg){return new Promise((resolve,reject)=>{google.script.run.withSuccessHandler(resolve).withFailureHandler(e=>reject(rpcError(e,name)))[name](arg);});}
async function read(){return rpc('getSpecialHours');}
function rowsForDay(){return periods.filter(p=>dateKey(p.startDate)===$('date').value);}
function mode(value){closed=value;$('open-day').setAttribute('aria-pressed',String(!closed));$('closed-day').setAttribute('aria-pressed',String(closed));$('intervals').hidden=closed;$('add-interval').hidden=closed;}
function picker(label,value,options){const select=document.createElement('select');select.setAttribute('aria-label',label);for(const [v,text] of options){const opt=new Option(text,String(v));select.add(opt);}select.value=String(value);if(select.selectedIndex<0)select.selectedIndex=-1;return select;}
function addRow(period){
 const index=$('intervals').children.length+1,row=document.createElement('div');row.className='interval';
 const times=document.createElement('div');times.className='time-row';
 for(const which of ['open','close']){
  const block=document.createElement('label');block.textContent=which==='open'?'開始':'終了';
  const t=period?.[which+'Time']||{hours:which==='open'?10:22,minutes:0};
  const value=(t.hours===24?0:t.hours||0)*60+(t.minutes||0);
  const select=picker(`${index} ${block.textContent}`,value,Array.from({length:48},(_,n)=>[n*30,clock({hours:Math.floor(n/2),minutes:n%2*30})]));
  select.className=which+'-time';if(select.selectedIndex<0)select.add(new Option('時刻を選択','',true,true));
  block.append(select);times.append(block);
 }
 const remove=document.createElement('button');remove.className='remove-interval';remove.textContent='×';remove.setAttribute('aria-label','この時間帯を削除');remove.onclick=()=>{row.remove();controls();};times.append(remove);row.append(times);
 const next=document.createElement('label');next.className='next-day';const check=document.createElement('input');check.type='checkbox';check.className='end-day';check.checked=!!(period&&(period.closeTime?.hours===24||period.endDate&&dateKey(period.endDate)!==dateKey(period.startDate)));next.append(check,document.createTextNode('終了は翌日'));row.append(next);
 $('intervals').append(row);controls();
}
function loadDay(){
 const selected=rowsForDay();$('day-state').textContent=!loaded?'未読込':selected.length?'登録済み':'未登録';
 mode(selected.some(p=>p.closed));$('intervals').replaceChildren();const open=selected.filter(p=>!p.closed);if(open.length)open.forEach(addRow);else addRow();renderList();controls();
}
function editDate(date){notice('');$('date').value=date;viewMonth=date.slice(0,7);loadDay();}
function renderList(){
 const month=viewMonth||$('date').value.slice(0,7);if(!month)return;
 const [year,m]=month.split('-').map(Number);$('calendar-month').textContent=year+'年'+m+'月';
 const list=$('schedule-list');list.replaceChildren();
 const start=new Date(Date.UTC(year,m-1,1)).getUTCDay(),days=new Date(Date.UTC(year,m,0)).getUTCDate();
 for(let i=0;i<start;i++){const blank=document.createElement('span');blank.className='calendar-blank';list.append(blank);}
 for(let day=1;day<=days;day++){
  const date=month+'-'+String(day).padStart(2,'0'),ps=periods.filter(p=>dateKey(p.startDate)===date),kind=ps.length?(ps.some(p=>p.closed)?'closed':'open'):'';
  const b=document.createElement('button');b.className='schedule-day';b.dataset.date=date;b.dataset.kind=kind;
  b.setAttribute('aria-label',displayDate(date)+' '+(!loaded?'未読み込み':kind==='closed'?'休業':kind==='open'?ps.map(describe).join(' / '):'通常営業時間'));
  if(date===$('date').value)b.setAttribute('aria-pressed','true');else b.setAttribute('aria-pressed','false');
  if(date===todayDate)b.setAttribute('aria-current','date');
  const num=document.createElement('span');num.textContent=day;const marker=document.createElement('small');marker.textContent=kind==='closed'?'休業':kind==='open'?'特別営業':'';b.append(num,marker);b.onclick=()=>editDate(date);list.append(b);
 }
}
function changeMonth(delta){const [y,m]=viewMonth.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));if(d.getUTCFullYear()<2000||d.getUTCFullYear()>9999)return;editDate(dateKey({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:1}));}
function displayDate(date){const d=parseDate(date);return new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(Date.UTC(d.year,d.month-1,d.day,3)))+` · ${d.year}`;}
async function refresh(){busy=true;controls();notice('Googleから読み込み中…');$('schedule-list').setAttribute('aria-busy','true');try{const data=await read();periods=data.periods||[];loaded=true;loadDay();notice('');}catch(e){notice(e.message,'error');if(!loaded){$('schedule-list').replaceChildren();const p=document.createElement('p');p.className='empty';p.textContent='「再読み込み」でGoogleの登録情報を取得してください。';$('schedule-list').append(p);}}finally{busy=false;$('schedule-list').setAttribute('aria-busy','false');controls();}}
function draft(){
 const time=value=>({hours:Math.floor(Number(value)/60),minutes:Number(value)%60});
 if(!closed&&[...document.querySelectorAll('#intervals select')].some(s=>s.value===''))throw Error('時刻を選んでください。');
 const rows=[...$('intervals').children].map(row=>({openTime:time(row.querySelector('.open-time').value),closeTime:time(row.querySelector('.close-time').value),nextDay:row.querySelector('.end-day').checked}));
 return makePeriods($('date').value,closed,rows);
}
function confirmChange(remove){try{const date=$('date').value;parseDate(date);const replacements=remove?[]:draft();replaceDay(periods,date,replacements);pending={date,replacements,baseline:signature(periods)};$('confirm-title').textContent=remove?'特別営業時間を削除しますか？':'この内容で保存しますか？';$('confirm-text').textContent=displayDate(date)+'\n'+(remove?'通常営業時間に戻ります。':replacements.map(describe).join('\n'));$('confirm-dialog').showModal();}catch(e){notice(e.message,'error');}}
async function apply(){const change=pending;if(!change||busy||!loaded||!native)return;$('confirm-dialog').close();pending=null;busy=true;controls();notice('Googleに保存中…');try{const verified=await rpc('saveSpecialHours',{date:change.date,replacements:change.replacements,baseline:change.baseline});periods=verified.periods||[];loadDay();notice('保存しました。','success');}catch(e){if(/保存結果|保存後の登録/.test(e.message)){loaded=false;$('day-state').textContent='要再読込';}notice(e.message,'error');}finally{busy=false;controls();}}
const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t).value;$('date').value=`${part('year')}-${part('month')}-${part('day')}`;todayDate=$('date').value;viewMonth=todayDate.slice(0,7);loadDay();
async function launch(){try{const response=await fetch('launch.json',{cache:'no-store'});if(!response.ok)throw Error();const {url}=await response.json();if(!/^https:\/\/script\.google\.com\/macros\/s\/AKfy[A-Za-z0-9_-]+\/exec$/.test(url||''))throw Error();location.replace(url);}catch{notice('管理画面の公開情報を読み込めませんでした。再読み込みしてください。','error');}}
$('connect').onclick=launch;
if(native){refresh();}else{notice('管理画面を開きます…');launch();}
$('date').onchange=()=>{if($('date').value)editDate($('date').value);};$('prev-month').onclick=()=>changeMonth(-1);$('next-month').onclick=()=>changeMonth(1);$('today').onclick=()=>editDate(todayDate);$('open-day').onclick=()=>mode(false);$('closed-day').onclick=()=>mode(true);$('add-interval').onclick=()=>addRow();$('refresh').onclick=refresh;$('save').onclick=()=>confirmChange(false);$('delete').onclick=()=>confirmChange(true);$('cancel-confirm').onclick=()=>{$('confirm-dialog').close();pending=null;};$('confirm-dialog').addEventListener('cancel',()=>{pending=null;});$('apply-confirm').onclick=apply;

// Agent navigation uses the same selected date and editor as the visible UI.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'select_special_hours_date',title:'営業時間の日付を選択',description:'編集する日付を選び、その日の現在の特別営業時間を表示する。Googleへの保存は行わない。',inputSchema:{type:'object',properties:{date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'}},required:['date'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(busy||$('confirm-dialog').open)throw Error('処理中です。');parseDate(input?.date);editDate(input.date);return {date:input.date,loaded,periods:rowsForDay()};}});
  register({name:'read_special_hours',title:'特別営業時間を確認',description:'接続済みのGoogleから読み込んだ特別営業時間を返す。再読み込みや保存は行わない。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(){if(!loaded)throw Error('Googleに接続し、営業時間を読み込んでください。');return {selectedDate:$('date').value,periods:structuredClone(periods)};}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}


