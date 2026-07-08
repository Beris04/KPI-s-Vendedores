
'use strict';
const fmtMoney = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0});
const fmtMoney2 = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2});
const fmtNum = new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
const fmtPct = new Intl.NumberFormat('es-MX',{style:'percent',maximumFractionDigits:1});
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTH_NUM = Object.fromEntries(MONTHS.map((m,i)=>[m,i+1]));
const SELLERS = [
  {key:'AGENTE CLAVE  GDL', name:'Sergio Garibay', goal:8014515.66, visitGoal:100},
  {key:'GDL1 - OSCAR YEPEZ', name:'Oscar Yepez', goal:1573563.46, visitGoal:100},
  {key:'GDL13 - SANDRA NAVARRO', name:'Sandra Navarro', goal:4469997.89, visitGoal:100},
  {key:'GDL14- ARCENIO AGUIRRE', name:'Arcenio Aguirre', goal:1091890.50, visitGoal:100},
  {key:'GDL15 - ALDO SIERRA', name:'Aldo Sierra', goal:965280.87, visitGoal:100},
  {key:'GDL3 - MARICELA REYNOSO', name:'Maricela Reynoso', goal:1620839.60, visitGoal:100},
  {key:'GDL4 - JULIO DE LA CRUZ', name:'Julio de la Cruz', goal:1082061.34, visitGoal:100},
  {key:'GDL5 - ALAN PEREZ', name:'Alan Perez', goal:2299895.26, visitGoal:100},
  {key:'GDL6 - DANIEL  AGUILAR', name:'Daniel Aguilar', goal:5227475.61, visitGoal:100},
  {key:'GDL9 - ANTONIO V.', name:'Antonio', goal:1518589.33, visitGoal:100},
];
const sellerByKey = new Map(SELLERS.map(s=>[normKey(s.key),s]));
const sellerByName = new Map(SELLERS.map(s=>[normKey(s.name),s]));
const VISIT_VENDOR_MAP = new Map([
  ['GARIBAY ORTIZ SERGIO JOEL','Sergio Garibay'],
  ['YEPEZ MORA OSCAR ALBERTO','Oscar Yepez'],
  ['SANDRA NAVARRO NAVARRO','Sandra Navarro'],
  ['AGUIRRE OJEDA ARCENIO','Arcenio Aguirre'],
  ['SIERRA DE ANDA ALDO','Aldo Sierra'],
  ['REYNOSO AGUILAR MARICELA','Maricela Reynoso'],
  ['DE LA CRUZ PONCE JULIO CESAR','Julio de la Cruz'],
  ['PEREZ MAR ALAN ROBERTO','Alan Perez'],
  ['AGUILAR NERI DANIEL','Daniel Aguilar'],
  ['VELEZ CASTELLANOS ANTONIO','Antonio'],
]);
let state = {
  activeYear: 2026,
  activeMonth: 6,
  salesRows: [],
  categoriesRows: [],
  visitsRows: [],
  noCobradoRows: [],
  giroRows: [],
  metas: Object.fromEntries(SELLERS.map(s=>[s.name,s.goal])),
  computed: {},
  loaded: {sales:false,categories:false,visits:false,noCobrado:false,giro:false,metas:true}
};
const SECTIONS = [
  ['dashboard','Dashboard'],['ventas','Meta de Ventas'],['visitas','Visita de clientes'],['categorias','Incremento y recuperación de categoría'],['prospectos','Prospección y recuperación de clientes'],['cartera','Cartera vencida'],['giro','Giro de Clientes'],['config','Configuración']
];
function normKey(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();}
function normProd(s){return normKey(s).replace(/[.,;:]/g,'').replace(/\s+/g,' ');}
function toNumber(v){
  if(v===null||v===undefined||v==='')return 0;
  if(typeof v==='number')return isFinite(v)?v:0;
  let s=String(v).replace(/\s/g,'').replace(/\$/g,'').replace(/,/g,'');
  s=s.replace(/[^0-9.\-]/g,'');
  const n=parseFloat(s); return isFinite(n)?n:0;
}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function toast(msg){const t=document.getElementById('toast'); t.innerHTML=msg; t.classList.add('show'); clearTimeout(t._to); t._to=setTimeout(()=>t.classList.remove('show'),4200);}
function setStatus(id,msg,ok=true){const el=document.getElementById(id); if(!el)return; el.innerHTML=msg; const box=el.closest('.filebox'); if(box){box.classList.toggle('ok',ok); box.classList.toggle('err',!ok);}}
function initNav(){
  const nav=document.getElementById('nav');
  nav.innerHTML=SECTIONS.map(([id,name])=>`<button class="navbtn ${id==='dashboard'?'active':''}" data-sec="${id}">${name}</button>`).join('');
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-sec]'); if(!b)return; showSec(b.dataset.sec);});
}
function showSec(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.sec===id));
  renderAll();
}
function tableHTML(id, title, rows, columns, options={}){
  const maxRows = options.maxRows ?? 500;
  const shown = rows.slice(0,maxRows);
  const nox = options.noX ? ' no-x':'';
  const scrollY = options.scrollY ? ' scroll-y':'';
  const totalNote = rows.length>maxRows ? `<span class="muted">Mostrando ${fmtNum.format(maxRows)} de ${fmtNum.format(rows.length)}</span>` : `<span class="muted">${fmtNum.format(rows.length)} registros</span>`;
  const head = columns.map(c=>`<th class="${c.cls||''}">${escapeHtml(c.label)}</th>`).join('');
  const body = shown.length ? shown.map(r=>`<tr>${columns.map(c=>`<td class="${c.cls||''}">${formatCell(c,r[c.key],r)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}" class="center muted">Sin información. Carga los archivos desde Configuración.</td></tr>`;
  return `<div class="card"><div class="toolbar" style="justify-content:space-between"><h3>${escapeHtml(title)}</h3><div class="toolbar"><button class="small" onclick="exportTable('${id}')">Exportar CSV</button>${totalNote}</div></div><div class="tablewrap${nox}${scrollY}"><table id="${id}" class="${options.dashboard?'dashboard-table':''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}
function formatCell(c,val,row){
  if(c.fmt==='money') return `<span class="num">${fmtMoney.format(toNumber(val))}</span>`;
  if(c.fmt==='money2') return `<span class="num">${fmtMoney2.format(toNumber(val))}</span>`;
  if(c.fmt==='num') return `<span class="num">${fmtNum.format(toNumber(val))}</span>`;
  if(c.fmt==='pct') return `<span class="num">${fmtPct.format(toNumber(val))}</span>`;
  if(c.fmt==='bar') { const p=Math.max(0,Math.min(1,toNumber(val))); return `<div class="bar"><span style="width:${Math.round(p*100)}%"></span></div><div class="num">${fmtPct.format(p)}</div>`; }
  if(c.render) return c.render(val,row);
  return escapeHtml(val);
}
function exportTable(id){
  const table=document.getElementById(id); if(!table)return;
  const rows=[...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>`"${td.innerText.replace(/"/g,'""')}"`).join(','));
  const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=id+'.csv'; a.click(); URL.revokeObjectURL(a.href);
}
function autoDetectPeriod(){
  if(!state.salesRows.length)return;
  let max = null;
  for(const r of state.salesRows){
    const y=toNumber(r.year); const m=monthToNum(r.month);
    if(y && m){ const k=y*100+m; if(max===null||k>max)max=k; }
  }
  if(max){state.activeYear=Math.floor(max/100); state.activeMonth=max%100;}
}
function monthToNum(m){
  if(typeof m==='number') return m;
  const s=normKey(m).toLowerCase();
  if(MONTH_NUM[s]) return MONTH_NUM[s];
  const n=parseInt(s,10); return isFinite(n)?n:0;
}
function monthLabel(){return MONTHS[state.activeMonth-1]+' '+state.activeYear;}
function prevMonthInfo(){let y=state.activeYear,m=state.activeMonth-1;if(m<1){m=12;y--;}return {y,m};}
function loadRowsAsObjects(rows, requiredHeaders){
  let best=-1,bestScore=-1;
  for(let i=0;i<Math.min(rows.length,50);i++){
    const vals=(rows[i]||[]).map(normKey);
    let score=0;
    for(const h of requiredHeaders){ if(vals.includes(normKey(h))) score++; }
    if(score>bestScore){best=i;bestScore=score;}
  }
  if(best<0 || bestScore===0) return [];
  const header=(rows[best]||[]).map(x=>String(x??'').trim());
  const out=[];
  for(let i=best+1;i<rows.length;i++){
    const row=rows[i]||[];
    if(row.every(x=>x===null||x===undefined||String(x).trim()==='')) continue;
    const o={};
    header.forEach((h,j)=>{if(h)o[h]=row[j]??''}); out.push(o);
  }
  return out;
}
function pick(o, names){ const m=Object.fromEntries(Object.keys(o).map(k=>[normKey(k),k])); for(const n of names){const k=m[normKey(n)]; if(k!==undefined)return o[k];} return '';}
async function handleFile(kind, file){
  try{
    setStatus('status_'+kind,`<span class="loading"></span> Leyendo ${escapeHtml(file.name)}...`,true);
    const sheets=await parseFileToSheets(file);
    if(kind==='sales'){
      let rows=[]; for(const sh of sheets){ const objs=loadRowsAsObjects(sh.rows,['AGENTE_DE_VENTAS_CLIENTE','NOMBRE_SN','DESCRIPCION_PRODUCTO','Suma de SUBTOTAL','Date - Mes']); if(objs.length){rows=objs;break;} }
      state.salesRows=normalizeSales(rows); state.loaded.sales=true; autoDetectPeriod();
      setStatus('status_sales',`DATA cargado: ${fmtNum.format(state.salesRows.length)} renglones. Mes activo detectado: <b>${monthLabel()}</b>.`,true);
    }
    if(kind==='categories'){
      let rows=[]; for(const sh of sheets){ const objs=loadRowsAsObjects(sh.rows,['DESCRIPCION DE PRODUCTO','Categoria']); if(objs.length){rows=objs;break;} }
      state.categoriesRows=normalizeCategories(rows); state.loaded.categories=true;
      setStatus('status_categories',`Categorías cargadas: ${fmtNum.format(state.categoriesRows.length)} productos.`,true);
    }
    if(kind==='visits'){
      let rows=[]; for(const sh of sheets){ const objs=loadRowsAsObjects(sh.rows,['day','vendor','client','type']); if(objs.length){rows=objs;break;} }
      state.visitsRows=normalizeVisits(rows); state.loaded.visits=true;
      setStatus('status_visits',`Visitas cargadas: ${fmtNum.format(state.visitsRows.length)} visitas reconocidas.`,true);
    }
    if(kind==='nocobrado'){
      let rows=[]; for(const sh of sheets){ const objs=loadRowsAsObjects(sh.rows,['Vendedor','Saldo']); if(objs.length){rows=objs;break;} }
      state.noCobradoRows=normalizeNoCobrado(rows); state.loaded.noCobrado=true;
      setStatus('status_nocobrado',`No cobrado cargado: ${fmtNum.format(state.noCobradoRows.length)} vendedores.`,true);
    }
    if(kind==='giro'){
      let rows=[]; for(const sh of sheets){ const objs=loadRowsAsObjects(sh.rows,['GIRO']); if(objs.length){rows=objs;break;} }
      state.giroRows=normalizeGiro(rows); state.loaded.giro=true;
      setStatus('status_giro',`Giro cargado: ${fmtNum.format(state.giroRows.length)} registros.`,true);
    }
    computeAll(); renderAll();
  }catch(err){ console.error(err); setStatus('status_'+kind,`Error: ${escapeHtml(err.message||err)}`,false); toast('No pude leer el archivo. Revisa que sea el formato correcto o pega la tabla como texto.'); }
}
function normalizeSales(rows){
  return rows.map(o=>{
    const key=String(pick(o,['AGENTE_DE_VENTAS_CLIENTE','Vendedor','ALMACEN AGRUPADO']));
    const seller=sellerByKey.get(normKey(key));
    return {
      sellerKey:key, seller:seller?.name||'', client:String(pick(o,['NOMBRE_SN','Cliente','CLIENTE'])), product:String(pick(o,['DESCRIPCION_PRODUCTO','Producto','DESCRIPCION DE PRODUCTO'])),
      subtotal:toNumber(pick(o,['Suma de SUBTOTAL','SUBTOTAL','VENTA','IMPORTE','Venta real'])),
      year:toNumber(pick(o,['Date - Año','Año','YEAR'])), month:pick(o,['Date - Mes','Mes','MONTH']), day:toNumber(pick(o,['Date - Día','Día','DAY']))
    };
  }).filter(r=>r.seller && r.client && r.product && r.year && monthToNum(r.month));
}
function normalizeCategories(rows){
  return rows.map(o=>({ code:String(pick(o,['CODIGO DE PRODUCTO','Articulo','Código'])), product:String(pick(o,['DESCRIPCION DE PRODUCTO','DESCRIPCION_PRODUCTO','Producto'])), category:String(pick(o,['Categoria','Categoría','CATEGORIA'])) }))
    .filter(r=>r.product && r.category);
}
function normalizeVisits(rows){
  const out=[];
  for(const o of rows){
    const original=String(pick(o,['vendor','Vendedor']));
    const mappedName=VISIT_VENDOR_MAP.get(normKey(original));
    if(!mappedName) continue;
    out.push({
      day:String(pick(o,['day','fecha','date'])), seller:mappedName, vendedor_original:original, client:String(pick(o,['client','cliente'])), type:String(pick(o,['type','tipo'])), notes:String(pick(o,['notes','notas'])), duration_sec:toNumber(pick(o,['duration_sec','duracion_seg','duración'])), city:String(pick(o,['city','ciudad']))
    });
  }
  return out;
}
function normalizeNoCobrado(rows){
  const out=[];
  for(const o of rows){
    let vend=String(pick(o,['Vendedor','AGENTE_DE_VENTAS_CLIENTE','ALMACEN AGRUPADO']));
    let seller = sellerByKey.get(normKey(vend)) || sellerByName.get(normKey(vend));
    if(!seller) continue;
    out.push({seller:seller.name, saldo:toNumber(pick(o,['Saldo','Deuda','No cobrado','Vencido']))});
  }
  return out;
}
function normalizeGiro(rows){
  return rows.map(o=>{
    const rawVend=String(pick(o,['Vendedor','AGENTE_DE_VENTAS_CLIENTE','ALMACEN AGRUPADO']));
    const seller=(sellerByKey.get(normKey(rawVend))||sellerByName.get(normKey(rawVend)))?.name || '';
    return {seller, client:String(pick(o,['Cliente','CLIENTE','NOMBRE_SN'])), giro:String(pick(o,['GIRO','Giro'])), venta:toNumber(pick(o,['SUBTOTAL','VENTA','IMPORTE','Venta','Suma de SUBTOTAL']))};
  }).filter(r=>r.giro && r.client);
}
function computeAll(){
  const catMap=new Map(state.categoriesRows.map(r=>[normProd(r.product), r.category]));
  const curr = state.salesRows.filter(r=>r.year===state.activeYear && monthToNum(r.month)===state.activeMonth);
  const prior = state.salesRows.filter(r=> (r.year*100+monthToNum(r.month)) < (state.activeYear*100+state.activeMonth));
  const pm=prevMonthInfo();
  const prev = state.salesRows.filter(r=>r.year===pm.y && monthToNum(r.month)===pm.m);
  const addCat = r => ({...r, category:catMap.get(normProd(r.product)) || 'SIN CATEGORÍA'});
  const currC = curr.map(addCat), priorC=prior.map(addCat), prevC=prev.map(addCat);
  const ventasBySeller=groupSum(currC, r=>r.seller, r=>r.subtotal);
  const metasRows=SELLERS.map(s=>{
    const venta=ventasBySeller.get(s.name)||0; const meta=state.metas[s.name]||s.goal||0;
    return {seller:s.name, meta, venta, avance:meta?venta/meta:0, faltante:Math.max(0,meta-venta)};
  });
  const visitsBySeller=groupCount(state.visitsRows.filter(r=>dateInActiveMonth(r.day)), r=>r.seller);
  const visitsRows=SELLERS.map(s=>{const v=visitsBySeller.get(s.name)||0, goal=s.visitGoal||100; return {seller:s.name, visits:v, avance:goal?v/goal:0, goal};});
  const priorClientCat=new Map(); priorC.forEach(r=>priorClientCat.set(keyCC(r.client,r.category), true));
  const prevClientCat=new Map(); prevC.forEach(r=>prevClientCat.set(keyCC(r.client,r.category), true));
  const currAgg=aggregate(currC, r=>keyCCP(r.seller,r.client,r.category,r.product), rows=>({seller:rows[0].seller, client:rows[0].client, category:rows[0].category, product:rows[0].product, venta:sum(rows,x=>x.subtotal)}));
  const categoryDetail=[];
  for(const rec of currAgg.values()){
    const hadPrior=priorClientCat.has(keyCC(rec.client,rec.category));
    const hadPrev=prevClientCat.has(keyCC(rec.client,rec.category));
    let type='Venta actual';
    if(!hadPrior) type='Colocación de categoría';
    else if(!hadPrev) type='Recuperación de categoría';
    categoryDetail.push({...rec,type});
  }
  const catRec = categoryDetail.filter(r=>r.type==='Recuperación de categoría');
  const catPlace = categoryDetail.filter(r=>r.type==='Colocación de categoría');
  const recGlobal = [...aggregate(catRec, r=>r.category, rows=>({category:rows[0].category, clientes:new Set(rows.map(x=>x.client)).size, venta:sum(rows,x=>x.venta)})).values()].sort((a,b)=>b.venta-a.venta);
  const placeClient = catPlace.map(r=>({seller:r.seller,client:r.client,category:r.category,product:r.product,venta:r.venta})).sort((a,b)=>b.venta-a.venta);
  const totalBySeller = groupSum(currC, r=>r.seller, r=>r.subtotal);
  const recSeller = [...aggregate(catRec, r=>r.seller, rows=>({seller:rows[0].seller, categorias:new Set(rows.map(x=>x.category)).size, clientes:new Set(rows.map(x=>x.client)).size, venta:sum(rows,x=>x.venta), pct:(sum(rows,x=>x.venta)/(totalBySeller.get(rows[0].seller)||1))})).values()].sort((a,b)=>b.venta-a.venta);
  const placeSeller = [...aggregate(catPlace, r=>r.seller, rows=>({seller:rows[0].seller, categorias:new Set(rows.map(x=>x.category)).size, clientes:new Set(rows.map(x=>x.client)).size, venta:sum(rows,x=>x.venta), pct:(sum(rows,x=>x.venta)/(totalBySeller.get(rows[0].seller)||1))})).values()].sort((a,b)=>b.venta-a.venta);
  const currentClients=new Map(); currC.forEach(r=>{const k=normKey(r.client); if(!currentClients.has(k))currentClients.set(k,[]); currentClients.get(k).push(r);});
  const priorClients=new Set(priorC.map(r=>normKey(r.client)));
  const prevClients=new Set(prevC.map(r=>normKey(r.client)));
  const newClients=[], recoveredClients=[];
  for(const rows of currentClients.values()){
    const client=rows[0].client; const nk=normKey(client); const seller=rows[0].seller; const venta=sum(rows,r=>r.subtotal);
    if(!priorClients.has(nk)) newClients.push({seller,client,venta});
    else if(!prevClients.has(nk)) recoveredClients.push({seller,client,venta});
  }
  const carteraAgg=[...aggregate(state.noCobradoRows, r=>r.seller, rows=>({seller:rows[0].seller, deuda:sum(rows,x=>x.saldo)})).values()].sort((a,b)=>b.deuda-a.deuda);
  const giroAgg=[...aggregate(state.giroRows, r=>(r.seller||'SIN VENDEDOR')+'|'+r.giro, rows=>({seller:rows[0].seller||'SIN VENDEDOR', giro:rows[0].giro, clientes:new Set(rows.map(x=>x.client)).size, venta:sum(rows,x=>x.venta)})).values()].sort((a,b)=>b.venta-a.venta);
  const recBySeller = groupSum(catRec,r=>r.seller,r=>r.venta), placeBySeller=groupSum(catPlace,r=>r.seller,r=>r.venta), newBySeller=groupCount(newClients,r=>r.seller), recoverClientBySeller=groupCount(recoveredClients,r=>r.seller), debtBySeller=groupSum(carteraAgg,r=>r.seller,r=>r.deuda);
  const dashboard=SELLERS.map(s=>{
    const mv=metasRows.find(x=>x.seller===s.name)||{}; const vv=visitsRows.find(x=>x.seller===s.name)||{};
    const ventaScore=Math.min(1,mv.avance||0), visitScore=Math.min(1,vv.avance||0), recScore=Math.min(1,(recBySeller.get(s.name)||0)/(totalBySeller.get(s.name)||1)), placeScore=Math.min(1,(placeBySeller.get(s.name)||0)/(totalBySeller.get(s.name)||1));
    const prospectScore=Math.min(1,(newBySeller.get(s.name)||0)/5), clientRecScore=Math.min(1,(recoverClientBySeller.get(s.name)||0)/5), debt=(debtBySeller.get(s.name)||0), carteraScore=debt>0?Math.max(0,1-Math.min(1,debt/500000)):1;
    const score=(ventaScore*.35+visitScore*.20+recScore*.12+placeScore*.12+prospectScore*.08+clientRecScore*.08+carteraScore*.05);
    return {seller:s.name, ventaScore, visitScore, recScore, placeScore, nuevos:newBySeller.get(s.name)||0, recuperados:recoverClientBySeller.get(s.name)||0, deuda:debt, score};
  }).sort((a,b)=>b.score-a.score).map((r,i)=>({...r,rank:i+1}));
  state.computed={metasRows, visitsRows, visitsDetail:state.visitsRows.filter(r=>dateInActiveMonth(r.day)), recGlobal, placeClient, recSeller, placeSeller, categoryDetail:categoryDetail.sort((a,b)=>b.venta-a.venta), newClients:newClients.sort((a,b)=>b.venta-a.venta), recoveredClients:recoveredClients.sort((a,b)=>b.venta-a.venta), carteraAgg, giroAgg, dashboard};
}
function keyCC(c,cat){return normKey(c)+'|'+normKey(cat)} function keyCCP(s,c,cat,p){return normKey(s)+'|'+normKey(c)+'|'+normKey(cat)+'|'+normKey(p)}
function sum(rows,fn){return rows.reduce((a,r)=>a+toNumber(fn(r)),0)}
function groupSum(rows,keyFn,valFn){const m=new Map(); rows.forEach(r=>{const k=keyFn(r);m.set(k,(m.get(k)||0)+toNumber(valFn(r)));});return m}
function groupCount(rows,keyFn){const m=new Map(); rows.forEach(r=>{const k=keyFn(r);m.set(k,(m.get(k)||0)+1);});return m}
function aggregate(rows,keyFn,buildFn){const m=new Map(); rows.forEach(r=>{const k=keyFn(r); if(!m.has(k))m.set(k,[]); m.get(k).push(r);}); const out=new Map(); for(const [k,rs] of m)out.set(k,buildFn(rs)); return out;}
function dateInActiveMonth(day){ if(!day)return true; const d=new Date(day); if(isNaN(d))return true; return d.getFullYear()===state.activeYear && (d.getMonth()+1)===state.activeMonth; }
function renderAll(){
  renderDashboard(); renderVentas(); renderVisitas(); renderCategorias(); renderProspectos(); renderCartera(); renderGiro(); renderConfig();
}
function renderDashboard(){
  const c=state.computed||{}; const rows=c.dashboard||[];
  document.getElementById('dashboard').innerHTML=`
    <div class="card"><h2>Dashboard Ranking · ${monthLabel()}</h2><p class="hint">Ranking compacto por vendedor. Score ponderado: ventas 35%, visitas 20%, recuperación categoría 12%, colocación categoría 12%, prospectos 8%, clientes recuperados 8%, cartera 5%.</p></div>
    <div class="grid grid4">
      <div class="kpi"><div class="label">Venta real mes</div><div class="val">${fmtMoney.format(sum(c.metasRows||[],r=>r.venta))}</div><div class="sub">Sólo vendedores reconocidos</div></div>
      <div class="kpi"><div class="label">Meta total</div><div class="val">${fmtMoney.format(sum(c.metasRows||[],r=>r.meta))}</div><div class="sub">Metas editables en Configuración</div></div>
      <div class="kpi"><div class="label">Visitas mes</div><div class="val">${fmtNum.format(sum(c.visitsRows||[],r=>r.visits))}</div><div class="sub">Sólo vendedores autorizados</div></div>
      <div class="kpi"><div class="label">Clientes nuevos</div><div class="val">${fmtNum.format((c.newClients||[]).length)}</div><div class="sub">No aparecían en meses anteriores</div></div>
    </div>
    ${tableHTML('tbl_dashboard','Tabulador de ranking',rows,[
      {key:'rank',label:'#',fmt:'num'},{key:'seller',label:'Vendedor'},
      {key:'ventaScore',label:'Ventas',fmt:'pct'},{key:'visitScore',label:'Visitas',fmt:'pct'},
      {key:'recScore',label:'Rec. Cat.',fmt:'pct'},{key:'placeScore',label:'Coloc. Cat.',fmt:'pct'},
      {key:'nuevos',label:'Prospectos',fmt:'num'},{key:'recuperados',label:'Rec. Clientes',fmt:'num'},
      {key:'deuda',label:'Cartera',fmt:'money'},{key:'score',label:'Score',fmt:'pct'}
    ],{noX:true,dashboard:true})}`;
}
function renderVentas(){
  document.getElementById('ventas').innerHTML=`<div class="card"><h2>Meta de Ventas · ${monthLabel()}</h2><p class="hint">La venta real sale del archivo DATA: suma de <b>Suma de SUBTOTAL</b> del mes activo por vendedor reconocido.</p></div>`+
    tableHTML('tbl_metas','Meta de Ventas',state.computed.metasRows||[],[
      {key:'seller',label:'Vendedor'},{key:'meta',label:'Meta',fmt:'money'},{key:'venta',label:'Venta real',fmt:'money'},{key:'avance',label:'Avance %',fmt:'pct'},{key:'faltante',label:'Faltante en monto',fmt:'money'}
    ],{noX:true});
}
function renderVisitas(){
  document.getElementById('visitas').innerHTML=`<div class="card"><h2>Visita de clientes · ${monthLabel()}</h2><p class="hint">Se omiten rutas, QIN, ALSEA, Verde Valle, Oficina, Esmeralda Sánchez y cualquier vendedor desconocido.</p></div>`+
    tableHTML('tbl_visitas_resumen','Resumen de visitas',state.computed.visitsRows||[],[
      {key:'seller',label:'Vendedor (nombre)'},{key:'visits',label:'Visitas en el mes',fmt:'num'},{key:'avance',label:'Avance',fmt:'pct'},{key:'goal',label:'Meta mensual',fmt:'num'}
    ],{noX:true})+
    tableHTML('tbl_visitas_detalle','Detalle de visitas cargadas',state.computed.visitsDetail||[],[
      {key:'day',label:'Fecha'},{key:'seller',label:'Vendedor'},{key:'vendedor_original',label:'Nombre en Excel'},{key:'client',label:'Cliente'},{key:'type',label:'Tipo'},{key:'duration_sec',label:'Duración seg.',fmt:'num'}
    ],{scrollY:true});
}
function renderCategorias(){
  document.getElementById('categorias').innerHTML=`<div class="card"><h2>Incremento y recuperación de Categoría · ${monthLabel()}</h2><p class="hint">Usa DATA + Catálogo de Categorías. Recuperación = cliente/categoría que ya había comprado antes, no compró el mes anterior y vuelve a comprar en el mes activo. Colocación = cliente/categoría que nunca había comprado antes y ahora sí compra.</p></div>`+
    tableHTML('tbl_rec_global','1. Recuperación por categoría global',state.computed.recGlobal||[],[
      {key:'category',label:'Categoría'},{key:'clientes',label:'Clientes',fmt:'num'},{key:'venta',label:'Venta recuperada',fmt:'money'}
    ],{noX:true})+
    tableHTML('tbl_col_cliente','2. Colocación de Categoría · cliente que no compraba esa categoría y ahora sí',state.computed.placeClient||[],[
      {key:'seller',label:'Vendedor'},{key:'client',label:'Cliente'},{key:'category',label:'Categoría'},{key:'product',label:'Producto'},{key:'venta',label:'Venta',fmt:'money'}
    ],{scrollY:true})+
    tableHTML('tbl_rec_vendedor','3. Recuperación de categoría por vendedor',state.computed.recSeller||[],[
      {key:'seller',label:'Vendedor'},{key:'categorias',label:'Categorías',fmt:'num'},{key:'clientes',label:'Clientes',fmt:'num'},{key:'venta',label:'Venta recuperada',fmt:'money'},{key:'pct',label:'% sobre venta del vendedor',fmt:'pct'}
    ],{noX:true})+
    tableHTML('tbl_col_vendedor','4. Colocación de categoría por vendedor',state.computed.placeSeller||[],[
      {key:'seller',label:'Vendedor'},{key:'categorias',label:'Categorías',fmt:'num'},{key:'clientes',label:'Clientes',fmt:'num'},{key:'venta',label:'Venta colocada',fmt:'money'},{key:'pct',label:'% sobre venta del vendedor',fmt:'pct'}
    ],{noX:true})+
    tableHTML('tbl_cat_detalle','5. Detalle de categorías',state.computed.categoryDetail||[],[
      {key:'type',label:'Tipo'},{key:'seller',label:'Vendedor'},{key:'client',label:'Cliente'},{key:'category',label:'Categoría'},{key:'product',label:'Producto'},{key:'venta',label:'Venta',fmt:'money'}
    ],{scrollY:true});
}
function renderProspectos(){
  document.getElementById('prospectos').innerHTML=`<div class="card"><h2>Prospección y recuperación de clientes · ${monthLabel()}</h2><p class="hint">Prospecto nuevo = cliente que aparece en mes activo y no aparecía en meses anteriores. Cliente recuperado = cliente que ya había comprado antes, no compró el mes anterior y vuelve a comprar en el mes activo.</p></div>`+
    tableHTML('tbl_clientes_recuperados','Tabla 1 · Clientes recuperados',state.computed.recoveredClients||[],[
      {key:'seller',label:'Vendedor'},{key:'client',label:'Cliente'},{key:'venta',label:'Venta mes actual',fmt:'money'}
    ],{scrollY:true})+
    tableHTML('tbl_prospectos','Tabla 2 · Prospectos nuevos',state.computed.newClients||[],[
      {key:'seller',label:'Vendedor'},{key:'client',label:'Cliente'},{key:'venta',label:'Venta mes actual',fmt:'money'}
    ],{scrollY:true});
}
function renderCartera(){
  document.getElementById('cartera').innerHTML=`<div class="card"><h2>Cartera Vencida / No cobrado</h2><p class="hint">Se alimenta con el Excel <b>no cobrado</b>. Columnas mínimas: Vendedor y Saldo.</p></div>`+
  tableHTML('tbl_cartera','Cartera vencida',state.computed.carteraAgg||[],[
    {key:'seller',label:'Vendedor'},{key:'deuda',label:'Deuda',fmt:'money2'}
  ],{noX:true});
}
function renderGiro(){
  document.getElementById('giro').innerHTML=`<div class="card"><h2>Giro de Clientes</h2><p class="hint">Información estratégica adicional. Se alimenta con archivo Giro y permite revisar venta por giro y vendedor.</p></div>`+
  tableHTML('tbl_giro','Venta por giro y vendedor',state.computed.giroAgg||[],[
    {key:'seller',label:'Vendedor'},{key:'giro',label:'Giro'},{key:'clientes',label:'Clientes',fmt:'num'},{key:'venta',label:'Venta',fmt:'money'}
  ],{scrollY:true});
}
function renderConfig(){
  const monthOptions=MONTHS.map((m,i)=>`<option value="${i+1}" ${state.activeMonth===i+1?'selected':''}>${m[0].toUpperCase()+m.slice(1)}</option>`).join('');
  const metaRows=SELLERS.map(s=>`<tr><td>${escapeHtml(s.name)}</td><td><input type="text" value="${state.metas[s.name]||0}" data-meta="${escapeHtml(s.name)}" oninput="updateMeta(this)" /></td></tr>`).join('');
  document.getElementById('config').innerHTML=`
    <div class="card"><h2>Configuración</h2><p class="hint">Carga aquí todos los archivos. Las demás secciones sólo muestran resultados.</p>
      <div class="toolbar"><span class="pill">Mes activo</span><select id="selMonth" onchange="state.activeMonth=toNumber(this.value); computeAll(); renderAll();">${monthOptions}</select><input id="selYear" type="number" value="${state.activeYear}" onchange="state.activeYear=toNumber(this.value); computeAll(); renderAll();" style="width:90px"><button class="primary" onclick="computeAll();renderAll();toast('KPIs recalculados')">Recalcular</button></div>
    </div>
    <div class="grid grid2">
      ${fileBox('sales','KPI Ventas / Categorías / Prospectos · DATA (1)','Carga el archivo DATA con AGENTE_DE_VENTAS_CLIENTE, NOMBRE_SN, DESCRIPCION_PRODUCTO, Suma de SUBTOTAL, Date - Año, Date - Mes, Date - Día. Este archivo alimenta Meta de Ventas, Categorías y Prospectos.')}
      ${fileBox('categories','Catálogo de categorías','Carga Categorias.xlsx. Se usa la hoja que tenga DESCRIPCION DE PRODUCTO y Categoria para enlazar producto → categoría.')}
      ${fileBox('visits','KPI Visitas · admin_visitas_filtros','Carga el archivo admin_visitas_filtros_YYYY-MM-DD_a_YYYY-MM-DD.xls. Puede venir como Excel HTML.')}
      ${fileBox('nocobrado','KPI Cartera Vencida · no cobrado','Carga el archivo no cobrado con columnas Vendedor y Saldo.')}
      ${fileBox('giro','Giro de Clientes','Carga archivo giro con cliente, giro, venta y vendedor si lo tienes.')}
      <div class="filebox"><strong>Metas mensuales</strong><div class="hint">Edita la meta mínima por vendedor. Se guarda en pantalla al escribir y recalcula el KPI.</div><div class="tablewrap scroll-y" style="max-height:260px"><table><thead><tr><th>Vendedor</th><th>Meta</th></tr></thead><tbody>${metaRows}</tbody></table></div><div id="status_metas" class="status">Metas de junio precargadas.</div></div>
    </div>`;
  bindFileInputs();
}
function fileBox(kind,title,desc){return `<div class="filebox"><strong>${escapeHtml(title)}</strong><div class="hint">${desc}</div><input type="file" id="file_${kind}" accept=".xlsx,.xls,.csv,.txt,.html" /><textarea id="text_${kind}" placeholder="También puedes pegar aquí la tabla desde Excel..."></textarea><div class="toolbar"><button class="primary" onclick="importText('${kind}')">Importar texto</button><button onclick="clearData('${kind}')">Limpiar</button></div><div id="status_${kind}" class="status">Registros cargados: 0</div></div>`}
function bindFileInputs(){['sales','categories','visits','nocobrado','giro'].forEach(k=>{const el=document.getElementById('file_'+k); if(el&&!el._bound){el.addEventListener('change',e=>{if(e.target.files[0])handleFile(k,e.target.files[0]);}); el._bound=true;}});}
function updateMeta(inp){state.metas[inp.dataset.meta]=toNumber(inp.value); computeAll(); renderAll();}
function clearData(kind){ if(kind==='sales')state.salesRows=[]; if(kind==='categories')state.categoriesRows=[]; if(kind==='visits')state.visitsRows=[]; if(kind==='nocobrado')state.noCobradoRows=[]; if(kind==='giro')state.giroRows=[]; state.loaded[kind]=false; computeAll(); renderAll(); }
async function importText(kind){
  const text=document.getElementById('text_'+kind).value.trim(); if(!text){toast('Pega primero la tabla.');return;}
  const rows=parseDelimited(text); const sheets=[{name:'Texto',rows}];
  const fake={name:'texto pegado'};
  try{
    if(kind==='sales'){let objs=loadRowsAsObjects(rows,['AGENTE_DE_VENTAS_CLIENTE','NOMBRE_SN','DESCRIPCION_PRODUCTO','Suma de SUBTOTAL']); state.salesRows=normalizeSales(objs); autoDetectPeriod(); setStatus('status_sales',`Texto cargado: ${fmtNum.format(state.salesRows.length)} renglones.`,true);}
    if(kind==='categories'){let objs=loadRowsAsObjects(rows,['DESCRIPCION DE PRODUCTO','Categoria']); state.categoriesRows=normalizeCategories(objs); setStatus('status_categories',`Texto cargado: ${fmtNum.format(state.categoriesRows.length)} categorías.`,true);}
    if(kind==='visits'){let objs=loadRowsAsObjects(rows,['day','vendor','client','type']); state.visitsRows=normalizeVisits(objs); setStatus('status_visits',`Texto cargado: ${fmtNum.format(state.visitsRows.length)} visitas.`,true);}
    if(kind==='nocobrado'){let objs=loadRowsAsObjects(rows,['Vendedor','Saldo']); state.noCobradoRows=normalizeNoCobrado(objs); setStatus('status_nocobrado',`Texto cargado: ${fmtNum.format(state.noCobradoRows.length)} saldos.`,true);}
    if(kind==='giro'){let objs=loadRowsAsObjects(rows,['GIRO']); state.giroRows=normalizeGiro(objs); setStatus('status_giro',`Texto cargado: ${fmtNum.format(state.giroRows.length)} giros.`,true);}
    computeAll(); renderAll();
  }catch(err){toast('No pude importar el texto: '+err.message)}
}
async function parseFileToSheets(file){
  const name=file.name.toLowerCase();
  if(name.endsWith('.xlsx')) return await parseXlsx(file);
  const text=await file.text();
  if(name.endsWith('.xls') && /^\s*</.test(text)) return [{name:'HTML',rows:parseHtmlTable(text)}];
  if(/^\s*</.test(text) && text.includes('<table')) return [{name:'HTML',rows:parseHtmlTable(text)}];
  return [{name:'Texto',rows:parseDelimited(text)}];
}
function parseHtmlTable(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const table=doc.querySelector('table'); if(!table) return [];
  return [...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()));
}
function parseDelimited(text){
  const sample=text.split(/\r?\n/).slice(0,5).join('\n');
  const delims=['\t',',',';','|']; let delim='\t', best=0;
  for(const d of delims){const n=(sample.match(new RegExp(d==='\t'?'\\t':'\\'+d,'g'))||[]).length; if(n>best){best=n;delim=d;}}
  const rows=[]; let row=[],val='',q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(ch==='"'){ if(q && nx==='"'){val+='"';i++;} else q=!q; }
    else if(ch===delim && !q){ row.push(val); val=''; }
    else if((ch==='\n'||ch==='\r') && !q){ if(ch==='\r'&&nx==='\n')i++; row.push(val); rows.push(row); row=[]; val=''; }
    else val+=ch;
  }
  if(val||row.length){row.push(val); rows.push(row);} return rows.filter(r=>r.some(x=>String(x).trim()!==''));
}
async function parseXlsx(file){
  const buf=await file.arrayBuffer(); const zip=parseZip(buf);
  const dec=new TextDecoder('utf-8');
  const workbookXml=dec.decode(await zip.read('xl/workbook.xml'));
  const relsXml=zip.has('xl/_rels/workbook.xml.rels')?dec.decode(await zip.read('xl/_rels/workbook.xml.rels')):'';
  const shared=zip.has('xl/sharedStrings.xml')?parseSharedStrings(dec.decode(await zip.read('xl/sharedStrings.xml'))):[];
  const relMap={}; for(const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)){relMap[m[1]]=m[2];}
  const sheets=[];
  for(const m of workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"[^>]*\/?/g)){
    const name=decodeXml(m[1]); const rid=m[2]; let target=relMap[rid]; if(!target) continue;
    target=target.replace(/^\//,''); if(!target.startsWith('xl/')) target='xl/'+target;
    if(!zip.has(target)) continue;
    const xml=dec.decode(await zip.read(target));
    sheets.push({name, rows:parseSheetXml(xml,shared)});
  }
  if(!sheets.length){
    for(const path of zip.names().filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n))){ const xml=dec.decode(await zip.read(path)); sheets.push({name:path,rows:parseSheetXml(xml,shared)}); }
  }
  return sheets;
}
function parseSharedStrings(xml){
  const arr=[]; for(const m of xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)){ const txt=[...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>decodeXml(x[1])).join(''); arr.push(txt); } return arr;
}
function colIndex(ref){const m=String(ref||'').match(/([A-Z]+)/i); if(!m)return null; let n=0; for(const ch of m[1].toUpperCase()){n=n*26+(ch.charCodeAt(0)-64);} return n-1;}
function parseSheetXml(xml,shared){
  const rows=[]; const rowRe=/<row[^>]*>([\s\S]*?)<\/row>/g; let rm;
  while((rm=rowRe.exec(xml))){
    const row=[]; const body=rm[1]; const cellRe=/<c([^>]*)>([\s\S]*?)<\/c>/g; let cm, seq=0;
    while((cm=cellRe.exec(body))){
      const attrs=cm[1], cb=cm[2]; const rattr=(attrs.match(/\sr="([^"]+)"/)||[])[1]; const idx=colIndex(rattr); const col=idx===null?seq:idx; row[col]=parseCell(attrs,cb,shared); seq=col+1;
    }
    rows.push(row.map(x=>x===undefined?'':x));
  }
  return rows;
}
function parseCell(attrs,body,shared){
  const t=(attrs.match(/\st="([^"]+)"/)||[])[1]||'';
  let inline=[...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x=>decodeXml(x[1])).join('');
  if(inline) return inline;
  const vm=body.match(/<v[^>]*>([\s\S]*?)<\/v>/); if(!vm)return '';
  const v=decodeXml(vm[1]);
  if(t==='s') return shared[parseInt(v,10)]||'';
  if(t==='str'||t==='inlineStr') return v;
  if(t==='b') return v==='1';
  const n=Number(v); return isFinite(n)?n:v;
}
function decodeXml(s){return String(s??'').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');}
function parseZip(buf){
  const dv=new DataView(buf); const u8=new Uint8Array(buf); let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-66000);i--){ if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;} }
  if(eocd<0) throw new Error('No parece ser XLSX válido.');
  const entries=dv.getUint16(eocd+10,true); const cdOffset=dv.getUint32(eocd+16,true); const files=new Map(); let p=cdOffset;
  const td=new TextDecoder('utf-8');
  for(let i=0;i<entries;i++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true), compSize=dv.getUint32(p+20,true), uncompSize=dv.getUint32(p+24,true), nameLen=dv.getUint16(p+28,true), extraLen=dv.getUint16(p+30,true), commentLen=dv.getUint16(p+32,true), localOffset=dv.getUint32(p+42,true);
    const name=td.decode(u8.slice(p+46,p+46+nameLen)); files.set(name,{method,compSize,uncompSize,localOffset});
    p+=46+nameLen+extraLen+commentLen;
  }
  return {has:n=>files.has(n), names:()=>[...files.keys()], read:async(n)=>{
    const f=files.get(n); if(!f) throw new Error('No existe '+n); const lp=f.localOffset;
    const nameLen=dv.getUint16(lp+26,true), extraLen=dv.getUint16(lp+28,true); const start=lp+30+nameLen+extraLen; const data=u8.slice(start,start+f.compSize);
    if(f.method===0) return data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
    if(f.method===8){
      if(!('DecompressionStream' in window)) throw new Error('Este navegador no soporta descompresión XLSX offline. Guarda como CSV o abre en Chrome/Edge.');
      const ds=new DecompressionStream('deflate-raw'); const blob=new Blob([data]); const stream=blob.stream().pipeThrough(ds); return await new Response(stream).arrayBuffer();
    }
    throw new Error('Método ZIP no soportado: '+f.method);
  }};
}
initNav(); computeAll(); renderAll();
