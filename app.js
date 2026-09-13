const DB_NAME="apuntes-db", STORE="entries", DB_VERSION=1;
const $=s=>document.querySelector(s);
let currentTab="home", editingId=null, statsYear=new Date().getFullYear();

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function allEntries(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function addEntry(e){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).add(e);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putEntry(e){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(e);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function deleteEntry(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function fmtDate(iso){const [y,m,d]=iso.split("-");return `${d}/${m}/${y.slice(2)}`}
function dayName(iso){const [y,m,d]=iso.split("-");return ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][new Date(Number(y),Number(m)-1,Number(d)).getDay()]}
function monthName(i){return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][i]}
function diffDays(a,b){return Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000)}
function avgBetween(ds){if(ds.length<2)return null;const a=[...ds].sort();return a.slice(1).reduce((s,d,i)=>s+diffDays(a[i],d),0)/(a.length-1)}
function nEntries(es){return es.filter(e=>e.type==="N"||e.type==="L")}
function sorted(es){return [...es].sort((a,b)=>b.date.localeCompare(a.date)||(b.id||0)-(a.id||0))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function resultClass(r){return r==="Bien"?"bien":r==="Regular"?"regular":r==="Mal"?"mal":"unrated"}
function showToast(msg){const x=document.createElement("div");x.className="toast";x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),1600)}

function nav(active){return `<div class="skin-nav"><button data-tab="home" class="${active==="home"?"active":""}"><b>⌂</b><span>Inicio</span></button><button data-tab="stats" class="${active==="stats"?"active":""}"><b>▥</b><span>Estadísticas</span></button><button data-tab="history" class="${active==="history"?"active":""}"><b>☷</b><span>Historial</span></button></div>`}
function bindNav(){document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;render()})}
function title(text,back=false){return `<div class="skin-title">${back?'<button class="skin-back" id="backBtn">‹</button>':''}<span>${text}</span></div>`}

async function render(){const es=await allEntries();document.body.className=`tab-${currentTab}`;if(currentTab==="home")renderHome(es);else if(currentTab==="stats")renderStats(es);else renderHistory(es)}

function renderHome(entries){
 const ns=nEntries(entries).sort((a,b)=>a.date.localeCompare(b.date));
 const dates=ns.map(e=>e.date), today=new Date().toISOString().slice(0,10);
 const days=dates.length?Math.max(0,diffDays(dates[dates.length-1],today)):null;
 const avg=avgBetween(dates);
 const first=dates[0];
 const now=new Date();
 const monthsElapsed=first?((now.getFullYear()-+first.slice(0,4))*12+(now.getMonth()-(+first.slice(5,7)-1))+1):0;
 const monthly=monthsElapsed?ns.length/monthsElapsed:null;
 const recent=[];for(let i=3;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);recent.push({y:d.getFullYear(),m:d.getMonth()})}
 const dyn=`<div class="home-values">
   <div class="hv hv1"><strong>${days==null?'—':days}</strong>${days==null?'':'<em>días</em>'}</div>
   <div class="hv hv2"><strong>${avg==null?'—':avg.toFixed(1).replace('.',',')}</strong>${avg==null?'':'<em>días</em>'}</div>
   <div class="hv hv3"><strong>${monthly==null?'—':monthly.toFixed(1).replace('.',',')}</strong><em>N/mes</em></div>
 </div>
 <div class="home-grid-overlay"><div class="row-labels">${[5,4,3,2,1].map(x=>`<span>${x}</span>`).join('')}</div>${recent.map(({y,m})=>{
   const key=`${y}-${String(m+1).padStart(2,'0')}`, arr=ns.filter(e=>e.date.startsWith(key)).sort((a,b)=>a.date.localeCompare(b.date)), ts=entries.filter(e=>e.type==='T'&&e.date.startsWith(key)).length;
   return `<div class="dyn-month ${m===now.getMonth()&&y===now.getFullYear()?'current':''}"><div class="dyn-slots">${[4,3,2,1,0].map(i=>{const e=arr[i];return `<div class="dyn-slot ${e?resultClass(e.result):'empty'} ${e?.type==='L'?'is-l':''}">${e?.type==='L'?'L':''}</div>`}).join('')}</div><div class="dyn-dots">${Array.from({length:Math.min(ts,5)},()=>'<i></i>').join('')}</div><div class="dyn-plate ${arr.length>5?'over':''}"><b>${monthName(m)}</b><small>${y}</small>${arr.length>5?`<strong>+${arr.length-5}</strong>`:''}</div></div>`}).join('')}</div>
 <button class="hit add-hit" id="addBtn" aria-label="Añadir apunte"></button>${nav('home')}`;
 $("#screen").innerHTML=`<div class="skin home-skin"></div><div class="skin-overlay">${dyn}</div>`;
 $("#addBtn").onclick=()=>openForm();bindNav();
}

function chartBars(es){const counts=Array.from({length:6},(_,i)=>{const m=new Date().getMonth()-5+i;const d=new Date(statsYear,m,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return {m:d.getMonth(),n:es.filter(e=>(e.type==='N'||e.type==='L')&&e.date.startsWith(key)).length}});const max=Math.max(7,...counts.map(x=>x.n));return counts.map(x=>`<div class="bar-col"><div class="bar" style="height:${Math.max(3,x.n/max*100)}%"></div><span>${monthName(x.m)}</span></div>`).join('')}
function donut(es){const ns=es.filter(e=>e.type==='N').length, ls=es.filter(e=>e.type==='L').length, ts=es.filter(e=>e.type==='T').length,total=ns+ls+ts||1;const a=ns/total*360,b=(ns+ls)/total*360;return `<div class="donut" style="--a:${a}deg;--b:${b}deg"><b>${ns+ls+ts}</b><small>apuntes</small></div><div class="legend"><span><i class="g"></i>Normales <b>${Math.round(ns/total*100)}%</b></span><span><i class="y"></i>Ligeros <b>${Math.round(ls/total*100)}%</b></span><span><i class="r"></i>Técnicos <b>${Math.round(ts/total*100)}%</b></span></div>`}
function weekBars(es){const counts=[0,0,0,0,0,0,0];es.forEach(e=>{const [y,m,d]=e.date.split('-');counts[new Date(+y,+m-1,+d).getDay()]++});const order=[1,2,3,4,5,6,0], max=Math.max(7,...counts);return order.map(i=>`<div class="bar-col blue"><div class="bar" style="height:${Math.max(3,counts[i]/max*100)}%"></div><span>${['D','L','M','X','J','V','S'][i]}</span></div>`).join('')}
function renderStats(entries){
 const year=statsYear, es=entries.filter(e=>e.date.startsWith(String(year)));
 const n=es.filter(e=>e.type==='N'), l=es.filter(e=>e.type==='L'), t=es.filter(e=>e.type==='T');
 $("#screen").innerHTML=`<div class="skin stats-skin"></div><div class="skin-overlay stats-overlay">${title('ESTADÍSTICAS',true)}
   <div class="stats-mask monthly-mask"><div class="box-title">APUNTES POR MES</div><div class="bars">${chartBars(es)}</div></div>
   <div class="stats-mask type-mask"><div class="box-title">TIPO DE APUNTE</div><div class="donut-wrap">${donut(es)}</div></div>
   <div class="stats-mask week-mask"><div class="box-title">DÍA DE LA SEMANA</div><div class="bars">${weekBars(es)}</div></div>
   <div class="stats-details"><div class="detail-head"><button id="prevYear">‹</button><b>${year}</b><button id="nextYear">›</button></div><div class="detail-grid"><div><strong>N</strong><span>Total ${n.length}</span><span>Media ${avgBetween(n.map(e=>e.date))==null?'—':avgBetween(n.map(e=>e.date)).toFixed(1)+' días'}</span></div><div><strong>L</strong><span>Total ${l.length}</span><span>Media ${avgBetween(l.map(e=>e.date))==null?'—':avgBetween(l.map(e=>e.date)).toFixed(1)+' días'}</span></div><div><strong>T</strong><span>Total ${t.length}</span><span>Sin mezclar con N</span></div></div><div class="result-detail"><b>CÓMO HA IDO</b>${['N','L','T'].map(type=>{const a=es.filter(e=>e.type===type),r=a.filter(e=>e.result),u=a.length-r.length;return `<div><strong>${type}</strong><span>Bien ${r.filter(e=>e.result==='Bien').length}</span><span>Regular ${r.filter(e=>e.result==='Regular').length}</span><span>Mal ${r.filter(e=>e.result==='Mal').length}</span>${u?`<span>Sin valorar ${u}</span>`:''}</div>`}).join('')}</div></div>${nav('stats')}</div>`;
 $("#prevYear").onclick=()=>{statsYear--;render()};$("#nextYear").onclick=()=>{statsYear++;render()};$("#backBtn").onclick=()=>{currentTab='home';render()};bindNav();
}

function renderHistory(entries){const es=sorted(entries);const rows=es.map(e=>`<button class="history-row" data-id="${e.id}"><div class="hdate"><b>${dayName(e.date)}</b><span>${fmtDate(e.date)}</span></div><div class="htype ${e.type}">${e.type}</div><div class="hdesc"><b>${e.type==='N'?'Apunte normal':e.type==='L'?'Apunte ligero':'Apunte técnico'}</b>${e.result?`<span class="${resultClass(e.result)}">${e.result}</span>`:'<span class="unrated">Sin valorar</span>'}${e.note?`<small>${esc(e.note)}</small>`:''}</div><i>›</i></button>`).join('');$("#screen").innerHTML=`<div class="skin history-skin"></div><div class="skin-overlay history-overlay">${title('HISTORIAL',true)}<div class="history-list">${rows||'<div class="empty-history">Aún no hay apuntes.</div>'}</div><div class="history-actions"><button id="exportBtn">⇧<span>EXPORTAR</span></button><button id="importBtn">⇩<span>IMPORTAR</span></button></div>${nav('history')}</div>`;$("#backBtn").onclick=()=>{currentTab='home';render()};$("#exportBtn").onclick=exportData;$("#importBtn").onclick=()=>$("#importFile").click();document.querySelectorAll('.history-row').forEach(b=>b.onclick=()=>openForm(Number(b.dataset.id)));bindNav()}

async function openForm(id=null){editingId=id;const existing=id?(await allEntries()).find(e=>e.id===id):null;const date=existing?.date||new Date().toISOString().slice(0,10),type=existing?.type||'N',result=existing?.result||'',note=existing?.note||'';const modal=$("#modal");modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');modal.innerHTML=`<div class="form-shell"><div class="form-title"><button id="closeForm">‹</button><b>${id?'EDITAR APUNTE':'AÑADIR APUNTE'}</b></div><label>FECHA</label><input id="fDate" type="date" value="${date}"><label>TIPO</label><div class="choices type-choices">${['N','L','T'].map(t=>`<button data-type="${t}" class="${t===type?'selected':''} ${t}">${t}</button>`).join('')}</div><label>CÓMO HA IDO</label><div class="choices result-choices">${[['','Sin valorar'],['Mal','Mal'],['Regular','Regular'],['Bien','Bien']].map(([v,l])=>`<button data-result="${v}" class="${v===result?'selected':''} ${resultClass(v)}">${l}</button>`).join('')}</div><label>NOTAS <small>(opcional)</small></label><textarea id="fNote" maxlength="200" placeholder="Añade una nota...">${esc(note)}</textarea><div class="form-buttons"><button id="cancelForm">CANCELAR</button><button id="saveForm">GUARDAR APUNTE</button></div>${id?'<button class="delete" id="deleteForm">ELIMINAR APUNTE</button>':''}</div>`;let st=type,sr=result;document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{st=b.dataset.type;document.querySelectorAll('[data-type]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{sr=b.dataset.result;document.querySelectorAll('[data-result]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});const close=()=>{modal.classList.add('hidden');editingId=null};$("#closeForm").onclick=close;$("#cancelForm").onclick=close;$("#saveForm").onclick=async()=>{const e={...(existing||{}),date:$("#fDate").value,type:st,result:sr,note:$("#fNote").value.trim()};if(!e.date)return;id?await putEntry(e):await addEntry(e);close();showToast(id?'Apunte actualizado':'Apunte guardado');render()};if(id)$("#deleteForm").onclick=async()=>{if(confirm('¿Eliminar este apunte?')){await deleteEntry(id);close();showToast('Apunte eliminado');render()}}}

async function exportData(){const entries=await allEntries();const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`apuntes-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("#importFile").addEventListener('change',async ev=>{const f=ev.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.entries))throw 0;for(const e of d.entries)if(e.date&&['N','L','T'].includes(e.type)&&['','Mal','Regular','Bien'].includes(e.result??''))await addEntry({date:e.date,type:e.type,result:e.result??'',note:e.note||''});showToast('Datos importados');render()}catch{alert('El archivo no es válido.')}ev.target.value=''})
render();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
