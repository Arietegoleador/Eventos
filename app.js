const DB_NAME="apuntes-db", STORE="entries", DB_VERSION=1;
const $=s=>document.querySelector(s);
let currentTab="home", editingId=null, statsYear=new Date().getFullYear();

function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function allEntries(){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readonly"),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putEntry(e){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(e);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function addEntry(e){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite"),r=tx.objectStore(STORE).add(e);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteEntry(id){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}

const INITIAL_DATA=[
  {date:"2026-08-30",type:"N"},{date:"2026-08-10",type:"L"},{date:"2026-08-02",type:"L"},
  {date:"2026-07-14",type:"L"},{date:"2026-07-01",type:"N"},{date:"2026-06-14",type:"N"},
  {date:"2026-05-30",type:"N"},{date:"2026-05-21",type:"L"},{date:"2026-05-08",type:"N"}
];
async function ensureInitialData(){const existing=await allEntries();for(const d of INITIAL_DATA){if(!existing.some(e=>e.date===d.date&&e.type===d.type))await addEntry({...d,result:"",note:""})}}

function fmtDate(iso){const [y,m,d]=iso.split("-");return `${d}/${m}/${y.slice(2)}`}
function monthName(i){return ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][i]}
function diffDays(a,b){return Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000)}
function mean(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function avgBetween(arr){if(arr.length<2)return null;const a=[...arr].sort();return mean(a.slice(1).map((d,i)=>diffDays(a[i],d)))}
function nEntries(entries){return entries.filter(e=>e.type==="N"||e.type==="L")}
function sorted(entries){return [...entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id)}
function resultClass(r){return r==="Bien"?"bien":r==="Regular"?"regular":r==="Mal"?"mal":"unrated"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function showToast(msg){const x=document.createElement("div");x.className="toast";x.textContent=msg;document.body.appendChild(x);setTimeout(()=>x.remove(),1800)}
function monthEntries(entries,y,m,typeFilter){const key=`${y}-${String(m+1).padStart(2,"0")}`;return entries.filter(e=>e.date.startsWith(key)&&(!typeFilter||e.type===typeFilter)).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id)}

async function render(){
  window.scrollTo(0,0);
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===currentTab));
  document.body.classList.toggle("secondary-screen",currentTab!=="home");
  const entries=await allEntries();
  if(currentTab==="home")renderHome(entries);else if(currentTab==="stats")renderStats(entries);else renderHistory(entries);
}

function renderHome(entries){
  const ns=nEntries(entries).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const dates=ns.map(e=>e.date),avg=avgBetween(dates);
  const today=new Date().toISOString().slice(0,10),now=new Date();
  const days=dates.length?Math.max(0,diffDays(dates[0],today)):0;
  const firstDate=dates.at(-1),monthsElapsed=firstDate?((now.getFullYear()-+firstDate.slice(0,4))*12+(now.getMonth()-+firstDate.slice(5,7))+1):0;
  const monthAvg=monthsElapsed?ns.length/monthsElapsed:0;
  const recent=Array.from({length:4},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-3+i,1);return {y:d.getFullYear(),m:d.getMonth()}});
  $("#screen").innerHTML=`
    <div class="titlebar"><h1>INICIO</h1></div>
    <button class="gold-btn add-main" id="addBtn"><span>＋</span>AÑADIR APUNTE</button>
    <div class="stats-row">
      <div class="metric"><div class="label">DÍAS DESDE<br>EL ÚLTIMO APUNTE</div><div class="value">${dates.length?days:"—"}</div><div class="unit">${dates.length?"días":""}</div></div>
      <div class="metric"><div class="label">MEDIA ENTRE<br>APUNTES</div><div class="value">${avg==null?"—":avg.toFixed(1).replace(".",",")}</div><div class="unit">${avg==null?"":"días"}</div></div>
      <div class="metric"><div class="label">MEDIA MENSUAL</div><div class="value">${dates.length?monthAvg.toFixed(1).replace(".",","):"—"}</div><div class="unit">N/mes</div></div>
    </div>
    <section class="panel"><div class="panel-title">ÚLTIMOS 4 MESES</div><div class="month-grid">
      <div class="rownums">${[5,4,3,2,1].map(n=>`<span>${n}</span>`).join("")}</div>
      ${recent.map(({y,m})=>{
        const es=monthEntries(nEntries(entries),y,m), visible=es.slice(-5);
        const ts=entries.filter(e=>e.type==="T"&&e.date.startsWith(`${y}-${String(m+1).padStart(2,"0")}`)).length;
        // DOM is oldest -> newest and CSS reverses the flex column: first entry is ALWAYS at row 1 (bottom).
        const slots=visible.map(e=>`<div class="slot ${resultClass(e.result)} ${e.type==="L"?"l":""}">${e.type==="L"?"L":""}</div>`);
        while(slots.length<5)slots.push(`<div class="slot empty"></div>`);
        return `<div class="month-col ${m===now.getMonth()&&y===now.getFullYear()?"current":""}">
          <div class="slots">${slots.join("")}</div>
          <div class="t-dots">${Array.from({length:Math.min(ts,5)},()=>`<i class="t-dot"></i>`).join("")}</div>
          <div class="month-plate ${es.length>5?"over":""}"><span>${monthName(m)}</span><small>${y}</small>${es.length>5?`<b>+${es.length-5}</b>`:""}</div>
        </div>`
      }).join("")}
    </div></section>`;
  $("#addBtn").onclick=()=>openForm();
}

function renderStats(){
  const year=new Date().getFullYear();
  const firstDate=entries.length?entries.map(e=>e.date).sort()[0]:null;
  const startLabel=firstDate?formatDate(firstDate):"—";

  const nl=entries.filter(e=>e.type==="N"||e.type==="L").sort((a,b)=>a.date.localeCompare(b.date));
  const nOnly=entries.filter(e=>e.type==="N");
  const lOnly=entries.filter(e=>e.type==="L");
  const tOnly=entries.filter(e=>e.type==="T");

  const dates=[...new Set(nl.map(e=>e.date))].sort();
  const intervals=[];
  for(let i=1;i<dates.length;i++){
    const a=new Date(dates[i-1]+"T12:00:00");
    const b=new Date(dates[i]+"T12:00:00");
    intervals.push(Math.round((b-a)/86400000));
  }
  const avgInterval=intervals.length?(intervals.reduce((a,b)=>a+b,0)/intervals.length):0;

  const monthRows=Array.from({length:12},(_,m)=>{
    const key=`${year}-${String(m+1).padStart(2,"0")}`;
    const n=nOnly.filter(e=>e.date.startsWith(key)).length;
    const l=lOnly.filter(e=>e.date.startsWith(key)).length;
    const t=tOnly.filter(e=>e.date.startsWith(key)).length;
    return {m,n,l,t,total:n+l};
  });

  const maxCount=5;
  const grid=Array.from({length:6},(_,i)=>maxCount-i);

  const bars=monthRows.map(x=>{
    const hN=x.n/maxCount*100;
    const hL=x.l/maxCount*100;
    return `<div class="stat-bar-col">
      <div class="stat-bar-area">
        <div class="stat-bar-stack">
          <div class="stat-bar-n" style="height:${hN}%"></div>
          <div class="stat-bar-l" style="height:${hL}%"></div>
        </div>
        ${x.t?`<i class="stat-t-dot" title="${x.t} T"></i>`:""}
      </div>
      <div class="stat-bar-month">${monthName(x.m)}</div>
    </div>`;
  }).join("");

  const gridHtml=grid.map(v=>`<span>${v}</span>`).join("");

  function ratingCard(type,label){
    const arr=entries.filter(e=>e.type===type);
    const total=arr.length;
    const rows=[
      ["","Sin valorar"],
      ["Bien","Bien"],
      ["Regular","Regular"],
      ["Mal","Mal"]
    ];
    return `<div class="stat-card rating-card">
      <div class="stat-card-title">${label}</div>
      ${rows.map(([value,text])=>{
        const n=arr.filter(e=>e.result===value).length;
        const pct=total?Math.round(n/total*100):0;
        return `<div class="rating-row ${resultClass(value)}"><span>${text}</span><strong>${n} <small>${pct}%</small></strong></div>`;
      }).join("")}
    </div>`;
  }

  const firstYearEntries=firstDate?entries.filter(e=>e.date>=firstDate):[];
  const firstYearNL=firstYearEntries.filter(e=>e.type==="N"||e.type==="L");
  const monthsCovered=firstDate?Math.max(1,((year-new Date(firstDate+"T12:00:00").getFullYear())*12 + (new Date().getMonth()-new Date(firstDate+"T12:00:00").getMonth()) + 1)):0;
  const monthlyAvg=monthsCovered?firstYearNL.length/monthsCovered:0;

  return `<section class="stats-page">
    <div class="stats-top">
      <div class="metric"><span>MEDIA ENTRE N/L</span><strong>${avgInterval?Math.round(avgInterval):"—"}</strong><small>días</small></div>
      <div class="metric"><span>MEDIA MENSUAL</span><strong>${monthlyAvg?monthlyAvg.toFixed(1):"—"}</strong><small>N/L</small></div>
      <div class="metric"><span>DATOS DESDE</span><strong>${firstDate?new Date(firstDate+"T12:00:00").toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"}):"—"}</strong><small>${firstDate?new Date(firstDate+"T12:00:00").getFullYear():""}</small></div>
    </div>

    <div class="stats-chart-card">
      <div class="stats-chart-title">N / L POR MES</div>
      <div class="stats-chart">
        <div class="stats-y-axis">${gridHtml}</div>
        <div class="stats-bars">${bars}</div>
      </div>
      <div class="stats-legend"><span><i class="legend-n"></i>N</span><span><i class="legend-l"></i>L</span><span><i class="legend-t"></i>T</span></div>
    </div>

    <div class="stats-cards">
      ${ratingCard("N","N")}
      ${ratingCard("L","L")}
      ${ratingCard("T","T")}
    </div>
  </section>`;
}
function dataLines(list,dates,type){const av=avgBetween(dates);return `<div class="line"><span>Total</span><strong>${list.length}</strong></div><div class="line"><span>Media entre ${type}</span><strong>${av==null?"—":av.toFixed(1).replace(".",",")+" días"}</strong></div><div class="line"><span>Más corto</span><strong>${range(dates)[0]}</strong></div><div class="line"><span>Más largo</span><strong>${range(dates)[1]}</strong></div>`}
function range(ds){if(ds.length<2)return["—","—"];const a=[...ds].sort(),d=a.slice(1).map((x,i)=>diffDays(a[i],x));return[Math.min(...d)+" días",Math.max(...d)+" días"]}
function intervalLines(ds){const [a,b]=range(ds),av=avgBetween(ds);return `<div class="line"><span>Media</span><strong>${av==null?"—":av.toFixed(1).replace(".",",")+" días"}</strong></div><div class="line"><span>Más corto</span><strong>${a}</strong></div><div class="line"><span>Más largo</span><strong>${b}</strong></div>`}
function ratingCard(type,es){const arr=es.filter(e=>e.type===type),total=arr.length;return `<div class="rating"><h4 class="${type===`N`?`bien`:type===`L`?`regular`:`mal`}">${type}</h4>${["","Bien","Regular","Mal"].map(r=>{const n=arr.filter(e=>e.result===r).length,label=r||"Sin valorar";return `<div class="rating-row ${r?resultClass(r):"unrated"}"><span>${label}</span><strong>${n}${total?` (${Math.round(n/total*100)}%)`:""}</strong></div>`}).join("")}</div>`}

function renderHistory(entries){
  const es=sorted(entries);
  $("#screen").innerHTML=`<div class="titlebar"><button class="back" id="backHome">‹</button><h1>HISTORIAL</h1></div>
    <div class="history-head"><span><b class="db-icon">●</b> ${es.length} APUNTES EN TOTAL</span><span>↓ &nbsp;Más recientes primero</span></div>
    <div class="history-tools"><button class="tool-btn" id="exportBtn"><span>↥</span> EXPORTAR</button><button class="tool-btn" id="importBtn"><span>↧</span> IMPORTAR</button></div>
    <div>${es.length?es.map(e=>`<button class="entry" data-id="${e.id}"><div class="entry-date">${fmtDate(e.date)}</div><div class="entry-type ${e.type}">${e.type}</div><div><div class="entry-result ${resultClass(e.result)}">${e.result||"Sin valorar"}</div>${e.note?`<div class="entry-note">${escapeHtml(e.note)}</div>`:""}</div><div class="chev">›</div></button>`).join(""):`<section class="panel" style="text-align:center;padding:35px 15px;color:#77949f">Aún no hay apuntes.</section>`}</div>`;
  $("#backHome").onclick=()=>{currentTab="home";render()};$("#exportBtn").onclick=exportData;$("#importBtn").onclick=()=>$("#importFile").click();document.querySelectorAll(".entry").forEach(b=>b.onclick=()=>openForm(Number(b.dataset.id)));
}

async function openForm(id=null){
  editingId=id;const existing=id?(await allEntries()).find(e=>e.id===id):null;
  const date=existing?.date||new Date().toISOString().slice(0,10),type=existing?.type||"N",result=existing?.result||"",note=existing?.note||"";
  $("#modal").classList.remove("hidden");$("#modal").setAttribute("aria-hidden","false");
  $("#modal").innerHTML=`<div class="modal-card"><div class="titlebar"><button class="back" id="closeForm">‹</button><h1>${id?"EDITAR APUNTE":"AÑADIR APUNTE"}</h1></div>
    <div class="field-label">FECHA</div><input class="date-input" id="fDate" type="date" value="${date}">
    <div class="field-label" style="margin-top:16px">TIPO</div><div class="choice-grid" id="typeChoices">${["N","L","T"].map(t=>`<button class="choice type-${t.toLowerCase()} ${t===type?"selected":""}" data-type="${t}">${t}</button>`).join("")}</div>
    <div class="field-label" style="margin-top:16px">CÓMO HA IDO</div><div class="choice-grid result-choice-grid" id="resultChoices"><button class="choice unrated-btn ${result===""?"selected":""}" data-result="">SIN VALORAR</button><button class="choice bien ${result==="Bien"?"selected":""}" data-result="Bien">BIEN</button><button class="choice regular ${result==="Regular"?"selected":""}" data-result="Regular">REGULAR</button><button class="choice mal ${result==="Mal"?"selected":""}" data-result="Mal">MAL</button></div>
    <div class="field-label" style="margin-top:16px">NOTAS <span style="opacity:.6">(opcional)</span></div><textarea class="notes" id="fNote" maxlength="200" placeholder="Añade una nota...">${escapeHtml(note)}</textarea>
    <div class="form-actions" style="margin-top:12px"><button class="secondary" id="cancelForm">CANCELAR</button><button class="gold-btn" id="saveForm">GUARDAR APUNTE</button></div>${id?`<button class="danger-btn" id="deleteForm">ELIMINAR APUNTE</button>`:""}</div>`;
  let selectedType=type,selectedResult=result;
  document.querySelectorAll("#typeChoices .choice").forEach(b=>b.onclick=()=>{selectedType=b.dataset.type;document.querySelectorAll("#typeChoices .choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
  document.querySelectorAll("#resultChoices .choice").forEach(b=>b.onclick=()=>{selectedResult=b.dataset.result;document.querySelectorAll("#resultChoices .choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
  const close=()=>{$("#modal").classList.add("hidden");$("#modal").setAttribute("aria-hidden","true");editingId=null};
  $("#closeForm").onclick=close;$("#cancelForm").onclick=close;
  $("#saveForm").onclick=async()=>{const wasEditing=Boolean(editingId),e={...(existing||{}),date:$("#fDate").value,type:selectedType,result:selectedResult,note:$("#fNote").value.trim()};if(!e.date)return;wasEditing?await putEntry(e):await addEntry(e);close();showToast(wasEditing?"Apunte actualizado":"Apunte guardado");render()};
  if(id)$("#deleteForm").onclick=async()=>{if(confirm("¿Eliminar este apunte?")){await deleteEntry(id);close();showToast("Apunte eliminado");render()}};
}

async function exportData(){const entries=await allEntries();const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`apuntes-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);showToast("Datos exportados")}
$("#importFile").addEventListener("change",async ev=>{const file=ev.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.entries))throw Error();for(const e of data.entries){if(!e.date||!["N","L","T"].includes(e.type)||!["","Mal","Regular","Bien"].includes(e.result??""))continue;await addEntry({date:e.date,type:e.type,result:e.result??"",note:e.note||""})}showToast("Datos importados");render()}catch{alert("El archivo no es válido.")}ev.target.value=""});
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab;render()});
(async()=>{try{await ensureInitialData();if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));await render()}catch(e){console.error(e)}})();
