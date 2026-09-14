const DB_NAME="apuntes-db", STORE="entries", DB_VERSION=1;
const $=s=>document.querySelector(s);
let currentTab="home", editingId=null, statsYear=new Date().getFullYear();

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function allEntries(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readonly"),s=tx.objectStore(STORE),r=s.getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putEntry(e){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(e);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function addEntry(e){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");const r=tx.objectStore(STORE).add(e);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteEntry(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
function fmtDate(iso){const [y,m,d]=iso.split("-");return `${d}/${m}/${y.slice(2)}`}
function monthName(i){return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][i]}
function diffDays(a,b){return Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000)}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function avgBetween(arr){if(arr.length<2)return null;arr=[...arr].sort();return mean(arr.slice(1).map((d,i)=>diffDays(arr[i],d)))}
function nEntries(entries){return entries.filter(e=>e.type==="N"||e.type==="L")}
function sorted(entries){return [...entries].sort((a,b)=>b.date.localeCompare(a.date))}
function resultClass(r){return r==="Bien"?"bien":r==="Regular"?"regular":r==="Mal"?"mal":"unrated"}

const initialData=[
  {date:"2026-08-30",type:"N",result:"",note:""},
  {date:"2026-08-10",type:"L",result:"",note:""},
  {date:"2026-08-02",type:"L",result:"",note:""},
  {date:"2026-07-14",type:"L",result:"",note:""},
  {date:"2026-07-01",type:"N",result:"",note:""},
  {date:"2026-06-14",type:"N",result:"",note:""},
  {date:"2026-05-30",type:"N",result:"",note:""},
  {date:"2026-05-21",type:"L",result:"",note:""},
  {date:"2026-05-08",type:"N",result:"",note:""}
];
async function ensureInitialData(){
  const entries=await allEntries();
  for(const seed of initialData){
    if(!entries.some(e=>e.date===seed.date&&e.type===seed.type)) await addEntry(seed);
  }
}
function typeClass(t){return t}
function showToast(msg){const x=document.createElement("div");x.className="toast";x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),1800)}

async function render(){
  window.scrollTo(0,0);
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===currentTab));
  document.body.classList.toggle("secondary-screen",currentTab!=="home");
  const entries=await allEntries();
  if(currentTab==="home") renderHome(entries);
  if(currentTab==="stats") renderStats(entries);
  if(currentTab==="history") renderHistory(entries);
}

function renderHome(entries){
  const ns=nEntries(entries).sort((a,b)=>b.date.localeCompare(a.date));
  const dates=ns.map(e=>e.date);
  const avg=avgBetween(dates);
  const now=new Date(); const today=now.toISOString().slice(0,10);
  const days=dates.length?Math.max(0,diffDays(dates[0],today)):0;
  const ym=new Date(now.getFullYear(),now.getMonth(),1);
  const firstDate=dates.length ? dates[dates.length-1] : null;
  const monthsElapsed=firstDate ? ((now.getFullYear()-Number(firstDate.slice(0,4)))*12 + (now.getMonth()-Number(firstDate.slice(5,7))+1)) : 0;
  const monthNs=monthsElapsed ? ns.length/monthsElapsed : 0;
  const recent=[]; for(let i=3;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);recent.push({y:d.getFullYear(),m:d.getMonth()})}
  $("#screen").innerHTML=`
    <div class="titlebar"><h1>INICIO</h1></div>
    <button class="gold-btn add-main" id="addBtn"><span>＋</span>AÑADIR APUNTE</button>
    <div class="stats-row">
      <div class="metric"><div class="label">DÍAS DESDE<br>EL ÚLTIMO APUNTE</div><div class="value">${dates.length?days:"—"}</div><div class="unit">${dates.length?"días":""}</div></div>
      <div class="metric"><div class="label">MEDIA ENTRE<br>APUNTES</div><div class="value">${avg==null?"—":avg.toFixed(1).replace(".",",")}</div><div class="unit">${avg==null?"":"días"}</div></div>
      <div class="metric"><div class="label">MEDIA MENSUAL</div><div class="value">${dates.length?monthNs.toFixed(1).replace(".",","):"—"}</div><div class="unit">N/mes</div></div>
    </div>
    <section class="panel">
      <div class="panel-title">ÚLTIMOS 4 MESES</div>
      <div class="month-grid">
        <div class="rownums">${[5,4,3,2,1].map(n=>`<span>${n}</span>`).join("")}</div>
        ${recent.map(({y,m})=>{
          const key=`${y}-${String(m+1).padStart(2,"0")}`;
          const es=ns.filter(e=>e.date.startsWith(key)).sort((a,b)=>a.date.localeCompare(b.date));
          const ts=entries.filter(e=>e.type==="T"&&e.date.startsWith(key)).length;
          return `<div class="month-col ${m===now.getMonth()&&y===now.getFullYear()?"current":""}">
            <div class="slots">${[4,3,2,1,0].map(i=>{const e=es[i];return e?`<div class="slot ${resultClass(e.result)} ${e.type==="L"?"l":""}">${e.type==="L"?"L":""}</div>`:`<div class="slot empty"></div>`}).join("")}</div>
            <div class="t-dots">${Array.from({length:Math.min(ts,5)},()=>`<i class="t-dot"></i>`).join("")}</div>
            <div class="month-plate ${es.length>5?"over":""}"><span>${monthName(m)}</span><small>${y}</small>${es.length>5?`<b>+${es.length-5}</b>`:""}</div>
          </div>`
        }).join("")}
      </div>
    </section>`;
  $("#addBtn").onclick=()=>openForm();
}

function renderStats(entries){
  const year=statsYear, yearEntries=entries.filter(e=>e.date.startsWith(String(year)));
  const allNL=nEntries(entries).sort((a,b)=>a.date.localeCompare(b.date));
  const ns=yearEntries.filter(e=>e.type==="N"), l=yearEntries.filter(e=>e.type==="L"), ts=yearEntries.filter(e=>e.type==="T");
  const nDates=ns.map(e=>e.date), lDates=l.map(e=>e.date), nlDates=yearEntries.filter(e=>e.type==="N"||e.type==="L").map(e=>e.date).sort();
  const monthly=Array.from({length:12},(_,m)=>yearEntries.filter(e=>e.type==="N"||e.type==="L"&&e.date.startsWith(`${year}-${String(m+1).padStart(2,"0")}`)));
  const monthlyNL=Array.from({length:12},(_,m)=>yearEntries.filter(e=>(e.type==="N"||e.type==="L")&&e.date.startsWith(`${year}-${String(m+1).padStart(2,"0")}`)));
  const firstDate=allNL.length?allNL[0].date:null;
  const today=new Date().toISOString().slice(0,10);
  const lastDate=allNL.length?allNL.at(-1).date:null;
  const monthsActive=firstDate?Math.max(1,(new Date(today.slice(0,7)+"-01T12:00:00").getFullYear()-Number(firstDate.slice(0,4)))*12+(new Date(today.slice(0,7)+"-01T12:00:00").getMonth()-Number(firstDate.slice(5,7)))+1):0;
  const monthlyAvg=allNL.length?(allNL.length/monthsActive):null;
  const interval=avgBetween(allNL.map(e=>e.date));
  const daysLast=lastDate?Math.max(0,diffDays(lastDate,today)):null;
  const totalNL=allNL.length;
  const chartMax=5;
  const chartRows=[5,4,3,2,1,0];
  const chartBars=monthlyNL.map((arr,m)=>{
    const nc=arr.filter(e=>e.type==="N").length, lc=arr.filter(e=>e.type==="L").length;
    const total=Math.min(chartMax,nc+lc);
    const shownN=Math.min(nc,total);
    const shownL=Math.max(0,total-shownN);
    const stackHeight=total?(total/chartMax)*100:0;
    const nHeight=total?(shownN/total)*100:0;
    const lHeight=total?(shownL/total)*100:0;
    return `<div class="bar-wrap"><div class="bar-stack" style="height:${stackHeight}%"><div class="bar-l" style="height:${lHeight}%"></div><div class="bar-n" style="height:${nHeight}%"></div></div><div class="bar-label">${monthName(m)}</div></div>`;
  }).join("");
  const tTotal=entries.filter(e=>e.type==="T").length, tSorted=entries.filter(e=>e.type==="T").sort((a,b)=>a.date.localeCompare(b.date));
  const tLast=tSorted.at(-1)?.date;
  $("#screen").innerHTML=`
    <div class="titlebar"><button class="back" id="backHome">‹</button><h1>ESTADÍSTICAS</h1></div>
    <div class="year-nav"><button id="prevYear">‹</button><div class="year">${year}⌄</div><button id="nextYear">›</button></div>
    <section class="panel"><div class="panel-title">RESUMEN GENERAL</div>
      <div class="summary-grid">
        <div class="summary"><b>${totalNL||"—"}</b><span>TOTAL N<br>(N + L)</span></div>
        <div class="summary"><b>${monthlyAvg==null?"—":monthlyAvg.toFixed(1).replace(".",",")}</b><span>N + L / MES</span></div>
        <div class="summary"><b>${interval==null?"—":interval.toFixed(1).replace(".",",")}</b><span>DÍAS ENTRE APUNTES</span></div>
        <div class="summary"><b>${daysLast==null?"—":daysLast}</b><span>DÍAS DESDE ÚLTIMO N/L</span></div>
      </div>
    </section>
    <section class="panel"><div class="panel-title">EVOLUCIÓN MENSUAL (N + L)</div>
      <div class="chart-legend"><span><i class="legend-n"></i>N</span><span><i class="legend-l"></i>L</span></div>
      <div class="chart"><div class="chart-grid">${chartRows.map(n=>`<div class="chart-line"><span>${n}</span></div>`).join("")}</div><div class="bars">${chartBars}</div></div>
    </section>
    <div class="card-grid">
      <div class="data-card N"><h3>N</h3>${dataLines(ns,nDates,"N")}</div>
      <div class="data-card L"><h3>L</h3>${dataLines(l,lDates,"L")}</div>
      <div class="data-card T full"><h3>T</h3><div class="line"><span>Total</span><strong>${tTotal}</strong></div><div class="line"><span>Días desde la última</span><strong>${tLast?diffDays(tLast,today)+" días":"—"}</strong></div><div class="line"><span>Nota</span><strong>No cuentan como N</strong></div></div>
    </div>
    <section class="panel"><div class="panel-title">CÓMO HA IDO</div><div class="rating-grid">${["N","L","T"].map(t=>ratingCard(t,yearEntries)).join("")}</div></section>`;
  $("#prevYear").onclick=()=>{statsYear--;render()};$("#nextYear").onclick=()=>{statsYear++;render()};$("#backHome").onclick=()=>{currentTab="home";render()};
}
function dataLines(list,dates,type){const av=avgBetween(dates);let ds=dates.length?[...dates].sort():"";return `<div class="line"><span>Total</span><strong>${list.length}</strong></div><div class="line"><span>Media entre ${type}</span><strong>${av==null?"—":av.toFixed(1).replace(".",",")+" días"}</strong></div><div class="line"><span>Más corto</span><strong>${range(dates)[0]}</strong></div><div class="line"><span>Más largo</span><strong>${range(dates)[1]}</strong></div>`}
function range(ds){if(ds.length<2)return["—","—"];const a=[...ds].sort();const d=a.slice(1).map((x,i)=>diffDays(a[i],x));return[Math.min(...d)+" días",Math.max(...d)+" días"]}
function intervalLines(ds){const [a,b]=range(ds),av=avgBetween(ds);return `<div class="line"><span>Media</span><strong>${av==null?"—":av.toFixed(1).replace(".",",")+" días"}</strong></div><div class="line"><span>Más corto</span><strong>${a}</strong></div><div class="line"><span>Más largo</span><strong>${b}</strong></div>`}
function ratingCard(type,es){const arr=es.filter(e=>e.type===type),total=arr.length;return `<div class="rating"><h4 class="${type==="N"?"bien":type==="L"?"regular":"mal"}">${type}</h4>${["Sin valorar","Bien","Regular","Mal"].map(r=>{const n=arr.filter(e=>(r==="Sin valorar"?!e.result:e.result===r)).length;return `<div class="rating-row ${resultClass(r)}"><span>${r}</span><strong>${n}${total?` (${Math.round(n/total*100)}%)`:""}</strong></div>`}).join("")}</div>`}

function renderHistory(entries){
  const es=sorted(entries);
  $("#screen").innerHTML=`
    <div class="titlebar"><button class="back" id="backHome">‹</button><h1>HISTORIAL</h1></div>
    <div class="history-head"><span><b class="db-icon">●</b> ${es.length} APUNTES EN TOTAL</span><span>↓ &nbsp;Más recientes primero</span></div>
    <div class="history-tools"><button class="tool-btn" id="exportBtn"><span>↥</span> EXPORTAR</button><button class="tool-btn" id="importBtn"><span>↧</span> IMPORTAR</button></div>
    <div>${es.length?es.map(e=>`<button class="entry" data-id="${e.id}">
      <div class="entry-date">${fmtDate(e.date)}</div><div class="entry-type ${typeClass(e.type)}">${e.type}</div>
      <div><div class="entry-result ${resultClass(e.result)}">${e.result||"Sin valorar"}</div>${e.note?`<div class="entry-note">${escapeHtml(e.note)}</div>`:""}</div><div class="chev">›</div>
    </button>`).join(""):`<section class="panel" style="text-align:center;padding:35px 15px;color:#77949f">Aún no hay apuntes.</section>`}</div>`;
  $("#backHome").onclick=()=>{currentTab="home";render()};
  $("#exportBtn").onclick=exportData;$("#importBtn").onclick=()=>$("#importFile").click();
  document.querySelectorAll(".entry").forEach(b=>b.onclick=()=>openForm(Number(b.dataset.id)));
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function openForm(id=null){
  editingId=id;
  const existing=id? (await allEntries()).find(e=>e.id===id):null;
  const date=existing?.date||new Date().toISOString().slice(0,10);
  const type=existing?.type||"N", result=existing?existing.result:"", note=existing?.note||"";
  $("#modal").classList.remove("hidden");$("#modal").setAttribute("aria-hidden","false");
  $("#modal").innerHTML=`<div class="modal-card">
    <div class="titlebar"><button class="back" id="closeForm">‹</button><h1>${id?"EDITAR APUNTE":"AÑADIR APUNTE"}</h1></div>
    <div class="field-label">FECHA</div><input class="date-input" id="fDate" type="date" value="${date}">
    <div class="field-label" style="margin-top:16px">TIPO</div>
    <div class="choice-grid" id="typeChoices">${["N","L","T"].map(t=>`<button class="choice type-${t.toLowerCase()} ${t===type?"selected":""}" data-type="${t}">${t}</button>`).join("")}</div>
    <div class="field-label" style="margin-top:16px">CÓMO HA IDO</div>
    <div class="choice-grid" id="resultChoices">${["Sin valorar","Mal","Regular","Bien"].map(r=>`<button class="choice ${resultClass(r)} ${r===result||(!result&&r==="Sin valorar")?"selected":""}" data-result="${r=== "Sin valorar" ? "" : r}">${r}</button>`).join("")}</div>
    <div class="field-label" style="margin-top:16px">NOTAS <span style="opacity:.6">(opcional)</span></div>
    <textarea class="notes" id="fNote" maxlength="200" placeholder="Añade una nota...">${escapeHtml(note)}</textarea>
    <div class="form-actions" style="margin-top:12px"><button class="secondary" id="cancelForm">CANCELAR</button><button class="gold-btn" id="saveForm">GUARDAR APUNTE</button></div>
    ${id?`<button class="danger-btn" id="deleteForm" style="width:100%;margin-top:10px;background:linear-gradient(#ff6767,#bd1616);color:#fff;border-color:#ff8b8b">ELIMINAR APUNTE</button>`:""}
  </div>`;
  let selectedType=type,selectedResult=result;
  document.querySelectorAll("#typeChoices .choice").forEach(b=>b.onclick=()=>{selectedType=b.dataset.type;document.querySelectorAll("#typeChoices .choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
  document.querySelectorAll("#resultChoices .choice").forEach(b=>b.onclick=()=>{selectedResult=b.dataset.result;document.querySelectorAll("#resultChoices .choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
  const close=()=>{$("#modal").classList.add("hidden");editingId=null};
  $("#closeForm").onclick=close;$("#cancelForm").onclick=close;
  $("#saveForm").onclick=async()=>{const wasEditing=Boolean(editingId);const e={...(existing||{}),date:$("#fDate").value,type:selectedType,result:selectedResult,note:$("#fNote").value.trim()};if(!e.date)return;wasEditing?await putEntry(e):await addEntry(e);close();showToast(wasEditing?"Apunte actualizado":"Apunte guardado");render()};
  if(id)$("#deleteForm").onclick=async()=>{if(confirm("¿Eliminar este apunte?")){await deleteEntry(id);close();showToast("Apunte eliminado");render()}};
}

async function exportData(){
  const entries=await allEntries();const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`apuntes-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast("Datos exportados");
}
$("#importFile").addEventListener("change",async ev=>{
  const file=ev.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.entries))throw Error();
    for(const e of data.entries){if(!e.date||!["N","L","T"].includes(e.type)||!(e.result===""||["Mal","Regular","Bien"].includes(e.result)))continue;await addEntry({date:e.date,type:e.type,result:e.result||"",note:e.note||""})}
    showToast("Datos importados");render();
  }catch{alert("El archivo no es válido.")}ev.target.value="";
});
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;render()});
ensureInitialData().then(()=>render());
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
