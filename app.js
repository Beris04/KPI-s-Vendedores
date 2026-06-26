const DATA = window.APP_DATA;
const LS = {
  sales: 'ranking_sales_actuals_v4',
  visits: 'ranking_visits_v3',
  overdue: 'ranking_overdue_v2',
  settings: 'ranking_settings_v4',
  targets: 'ranking_sales_targets_v4',
  categories: 'ranking_categories_v2',
  ghUrl: 'ranking_gh_visits_url_v2',
  supabase: 'ranking_supabase_v2'
};

const TABS = [
  ['dashboard', 'Dashboard', 'D'],
  ['ranking', 'Tabulador ranking', 'R'],
  ['sales', 'Meta de Ventas', 'V'],
  ['visits', 'Visitas clientes', 'C'],
  ['recovery', 'Recuperación productos', 'P'],
  ['catalog', 'Incremento catálogo', 'I'],
  ['prospecting', 'Prospección', 'N'],
  ['overdue', 'Cartera vencida', 'M'],
  ['giro', 'Giro clientes', 'G'],
  ['config', 'Configuración', '⚙']
];

let state = { tab: 'dashboard', agent: '__ALL__', currentRows: [] };
let settings = loadJSON(LS.settings, DATA.defaults || {});
settings.weights = settings.weights || (DATA.defaults || {}).weights || {};
settings.goals = settings.goals || (DATA.defaults || {}).goals || {};
settings.scoreMode = settings.scoreMode || 'available';
settings.period = settings.period || (DATA.defaults || {}).period || { month: DATA.meta.month, monthName: DATA.meta.monthName };
let salesActuals = loadJSON(LS.sales, DATA.salesActuals || {});
let salesTargets = loadJSON(LS.targets, DATA.salesTargets || (DATA.defaults || {}).salesTargets || {});
let categoryTargets = loadJSON(LS.categories, DATA.categories || (DATA.defaults || {}).categories || []);
let visits = loadJSON(LS.visits, DATA.visits || []);
let overdue = loadJSON(LS.overdue, []);

function clone(o){ return JSON.parse(JSON.stringify(o || {})); }
function loadJSON(k, fallback){ try{ const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : clone(fallback); }catch(e){ return clone(fallback); } }
function saveJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
function fmt(n, dec = 0){ if(n === null || n === undefined || n === '') return 'Pend.'; return Number(n).toLocaleString('es-MX', { maximumFractionDigits: dec, minimumFractionDigits: dec }); }
function money(n){ if(n === null || n === undefined || n === '') return 'Pend.'; return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }); }
function pct(n){ if(n === null || n === undefined || Number.isNaN(n)) return 'Pend.'; return `${fmt(n, 1)}%`; }
function norm(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function sum(arr, key){ return arr.reduce((a, r) => a + (Number(r[key]) || 0), 0); }
function clamp(n, min = 0, max = 100){ return Math.max(min, Math.min(max, Number(n) || 0)); }
function statusClass(score){ if(score === null || score === undefined || Number.isNaN(score)) return 'info'; if(score >= 90) return 'good'; if(score >= 70) return 'warn'; return 'bad'; }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>"]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[m])); }
function currentAgents(){ return state.agent === '__ALL__' ? DATA.agents : [state.agent]; }
function activeMonthName(){ return settings?.period?.monthName || DATA.meta.monthName; }
function activeMonth(){ return settings?.period?.month || DATA.meta.month; }

function init(){
  visits = normalizeVisits(visits);
  renderNav();
  renderAgentFilter();
  renderQualityBanner();
  render();
  document.getElementById('btnExportCurrent').onclick = () => exportCSV(state.currentRows, `${state.tab}_${activeMonth()}.csv`);
}

function renderNav(){
  const nav = document.getElementById('navTabs');
  nav.innerHTML = TABS.map(([id, label, icon]) => `<button class="nav-btn ${state.tab === id ? 'active' : ''}" data-tab="${id}"><span>${icon}</span>${label}</button>`).join('');
  nav.querySelectorAll('button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; renderNav(); render(); });
}

function renderAgentFilter(){
  const sel = document.getElementById('agentFilter');
  sel.innerHTML = ['__ALL__', ...DATA.agents].map(a => `<option value="${escapeHtml(a)}">${a === '__ALL__' ? 'Todos los vendedores' : escapeHtml(a)}</option>`).join('');
  sel.value = state.agent;
  sel.onchange = () => { state.agent = sel.value; render(); };
}

function renderQualityBanner(){
  const b = document.getElementById('qualityBanner');
  b.innerHTML = `<strong>Notas de datos:</strong> ${DATA.meta.notes.map(escapeHtml).join(' · ')}<br><span class="small">Metas editables por mes en Configuración · Visitas importables desde Excel/CSV.</span>`;
}

function render(){
  const title = TABS.find(t => t[0] === state.tab)?.[1] || 'Dashboard';
  document.getElementById('pageTitle').textContent = title;
  const brandPeriod = document.querySelector('.brand p');
  if(brandPeriod) brandPeriod.textContent = `Guadalajara · ${activeMonthName()}`;
  const views = { dashboard, ranking, sales, visits: visitsView, recovery, catalog, prospecting, overdue: overdueView, giro, config };
  document.getElementById('viewContainer').innerHTML = views[state.tab]();
  bindAfterRender();
}

function bindAfterRender(){
  document.querySelectorAll('[data-action="export"]').forEach(btn => btn.onclick = () => {
    const rows = btn.dataset.exportKey ? rowsForExport(btn.dataset.exportKey) : state.currentRows;
    exportCSV(rows, btn.dataset.name || 'export.csv');
  });
  const search = document.getElementById('tableSearch');
  if(search) search.oninput = () => renderSearchableTable(search);
  if(state.tab === 'sales') bindSales();
  if(state.tab === 'visits') bindVisits();
  if(state.tab === 'overdue') bindOverdue();
  if(state.tab === 'config') bindConfig();
}

function kpiCard(label, value, sub, progress = null){
  const cls = statusClass(progress);
  return `<div class="kpi-card"><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div><div class="sub">${sub || ''}</div>${progress !== null ? `<div class="progress ${cls === 'bad' ? 'bad' : cls === 'warn' ? 'warn' : ''}"><i style="width:${clamp(progress)}%"></i></div>` : ''}</div>`;
}

function getTarget(agent){
  const exact = salesTargets[agent];
  if(exact) return exact;
  const key = Object.keys(salesTargets).find(k => norm(k) === norm(agent));
  if(key) return salesTargets[key];
  const m = metricForAgent(agent);
  return { min: m?.metaMin || null, max: m?.metaMax || null };
}
function targetMin(agent){ return Number(getTarget(agent)?.min) || 0; }
function targetMax(agent){ return Number(getTarget(agent)?.max) || 0; }
function metricForAgent(agent){ return DATA.metrics.find(m => norm(m.agent) === norm(agent)); }
function metricRows(){ return currentAgents().map(a => metricForAgent(a) || blankMetric(a)); }
function blankMetric(agent){ return { agent, metaMin:null, metaMax:null, qtyMay:0, qtyJanMay:0, clientsMay:0, productsMay:0, newClients:0, qtyProspects:0, catalogIncrements:0, catalogClients:0, qtyCatalog:0, recovered:0, recoveredClients:0, qtyRecovered:0, lostPotential:0, lostClients:0, recoveryRate:null, rows:0 }; }

function aggregateMetrics(){
  const agents = currentAgents();
  const rows = metricRows();
  const total = {
    agents: rows.length,
    metaMin: agents.reduce((a, v) => a + targetMin(v), 0),
    metaMax: agents.reduce((a, v) => a + targetMax(v), 0),
    qtyMay: sum(rows, 'qtyMay'),
    clientsMay: sum(rows, 'clientsMay'),
    productsMay: sum(rows, 'productsMay'),
    recovered: sum(rows, 'recovered'),
    lostPotential: sum(rows, 'lostPotential'),
    catalogIncrements: sum(rows, 'catalogIncrements'),
    newClients: sum(rows, 'newClients'),
    qtyRecovered: sum(rows, 'qtyRecovered')
  };
  total.recoveryRate = (total.recovered + total.lostPotential) > 0 ? total.recovered / (total.recovered + total.lostPotential) * 100 : null;
  total.salesActual = agents.reduce((a, v) => a + (Number(salesActuals[v]) || 0), 0);
  total.salesProgress = total.metaMin ? total.salesActual / total.metaMin * 100 : null;
  total.visits = countVisitsForAgents(agents).count;
  total.visitProgress = settings.goals.monthlyVisits ? total.visits / (settings.goals.monthlyVisits * agents.length) * 100 : null;
  total.overdue = overdue.filter(r => agents.some(a => matchAgent(r.agent || r.vendor, a))).reduce((a, r) => a + (Number(r.amount) || 0), 0);
  total.overdueScore = overdue.length ? overdueScore(total.overdue, agents.length) : null;
  return total;
}

function dashboard(){
  const a = aggregateMetrics();
  const rankingRows = buildRanking().slice(0, 5);
  const chartRows = metricRows().sort((x, y) => (y.recovered || 0) - (x.recovered || 0)).slice(0, 8);
  const coverage = buildCoverageRows();
  const complete = coverage.filter(r => r.missingCategories === '').length;
  const avgCoverage = coverage.length ? coverage.reduce((s, r) => s + Number(r.coveragePct || 0), 0) / coverage.length : 0;
  state.currentRows = buildRanking();
  return `<div class="grid cols-4">
    ${kpiCard('Meta de Ventas', money(a.salesActual), `Meta mínima: ${money(a.metaMin)} · Avance: ${pct(a.salesProgress)}`, a.salesProgress)}
    ${kpiCard('Visitas a clientes', fmt(a.visits), `Meta mensual: ${fmt(settings.goals.monthlyVisits * a.agents)} visitas`, a.visitProgress)}
    ${kpiCard('Recuperación', fmt(a.recovered), `${fmt(a.lostPotential)} productos pendientes · ${pct(a.recoveryRate)}`, a.recoveryRate)}
    ${kpiCard('Cobertura catálogo', pct(avgCoverage), `${fmt(complete)} clientes con catálogo completo`, avgCoverage)}
  </div>
  <div class="grid cols-2" style="margin-top:18px">
    <div class="card"><div class="section-title"><h3>Top ranking disponible</h3><span class="pill info">${activeMonthName()}</span></div>${renderTable(rankingRows, [['rank','#'],['agent','Vendedor'],['score','Puntaje'],['salesScore','Ventas'],['visitScore','Visitas'],['recoveryScore','Recup.'],['catalogScore','Catálogo'],['prospectingScore','Prospectos'],['overdueScore','Cartera']], { limit: 5, formatters: scoreFormatters() })}</div>
    <div class="card"><div class="section-title"><h3>Productos recuperados por vendedor</h3><span class="muted small">Top 8</span></div>${barList(chartRows, 'agent', 'recovered')}</div>
  </div>
  <div class="grid cols-2" style="margin-top:18px">
    <div class="card"><h3>Alertas rápidas</h3>${alertsHtml()}</div>
    <div class="card"><h3>Cómo se está midiendo</h3><p class="footnote"><b>Recuperación:</b> productos que se vendieron en Mayo, no se vendieron en Abril, pero sí tenían historial entre Enero-Marzo.<br><b>Incremento catálogo:</b> producto comprado en Mayo por un cliente que no lo tenía en Enero-Abril.<br><b>Prospección:</b> cliente con compra en Mayo y sin compra Enero-Abril.<br><b>Cartera vencida:</b> se captura/importa al día 5 de cada mes.</p></div>
  </div>`;
}

function alertsHtml(){
  const missingMeta = DATA.agents.filter(a => !targetMin(a));
  const noSalesActual = DATA.agents.filter(a => targetMin(a) && !(Number(salesActuals[a]) > 0)).length;
  return `<ul class="footnote"><li><b>${noSalesActual}</b> vendedores/rutas con meta pero sin venta real capturada en pesos.</li><li><b>${visits.length}</b> visitas cargadas actualmente desde Excel/local.</li><li><b>${overdue.length}</b> registros de cartera vencida cargados.</li><li><b>${missingMeta.length}</b> vendedores/rutas sin meta de venta: ${missingMeta.map(escapeHtml).join(', ') || 'ninguno'}.</li></ul>`;
}

function barList(rows, labelKey, valueKey){
  const max = Math.max(1, ...rows.map(r => Number(r[valueKey]) || 0));
  return `<div class="bar-list">${rows.map(r => `<div class="bar-row"><div class="bar-label" title="${escapeHtml(r[labelKey])}">${escapeHtml(r[labelKey])}</div><div class="bar-track"><div class="bar-fill" style="width:${(Number(r[valueKey]) || 0) / max * 100}%"></div></div><div class="num"><b>${fmt(r[valueKey])}</b></div></div>`).join('')}</div>`;
}

function buildRanking(){
  return DATA.agents.filter(a => currentAgents().includes(a)).map(agent => {
    const m = metricForAgent(agent) || blankMetric(agent);
    const salesActual = Number(salesActuals[agent]) || 0;
    const minMeta = targetMin(agent);
    const salesScore = minMeta ? clamp(salesActual / minMeta * 100) : null;
    const visitCount = countVisitsForAgents([agent]).count;
    const visitScore = visits.length ? clamp(visitCount / settings.goals.monthlyVisits * 100) : null;
    const recoveryScore = m.recoveryRate;
    const catalogScore = settings.goals.catalogIncrements ? clamp((m.catalogIncrements || 0) / settings.goals.catalogIncrements * 100) : null;
    const prospectingScore = settings.goals.prospects ? clamp((m.newClients || 0) / settings.goals.prospects * 100) : null;
    const ov = overdueTotalForAgent(agent);
    const ovScore = overdue.length ? overdueScore(ov, 1) : null;
    const kp = { salesScore, visitScore, recoveryScore, catalogScore, prospectingScore, overdueScore: ovScore };
    const score = weightedScore(kp);
    return { agent, score, salesScore, visitScore, recoveryScore, catalogScore, prospectingScore, overdueScore: ovScore, salesActual, metaMin: minMeta, visits: visitCount, recovered: m.recovered || 0, catalog: m.catalogIncrements || 0, prospects: m.newClients || 0, overdue: ov };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((r, i) => ({ ...r, rank: i + 1 }));
}

function weightedScore(kp){
  const map = [['salesScore','sales'],['visitScore','visits'],['recoveryScore','recovery'],['catalogScore','catalog'],['prospectingScore','prospecting'],['overdueScore','overdue']];
  let num = 0, den = 0;
  for(const [k, wk] of map){
    const w = Number(settings.weights[wk]) || 0;
    const v = kp[k];
    if(settings.scoreMode === 'available'){
      if(v !== null && v !== undefined && !Number.isNaN(v)){ num += clamp(v) * w; den += w; }
    } else {
      num += clamp(v || 0) * w; den += w;
    }
  }
  return den ? Number((num / den).toFixed(1)) : null;
}

function ranking(){
  const rows = buildRanking();
  state.currentRows = rows;
  return `<div class="card"><div class="section-title"><h3>Tabulador de ranking por vendedor</h3><span class="pill info">Modo: ${settings.scoreMode === 'available' ? 'solo datos disponibles' : 'completo con pendientes en 0'}</span></div>${renderTable(rows, [['rank','#'],['agent','Vendedor'],['score','Puntaje'],['salesScore','Meta Ventas %'],['visitScore','Visitas %'],['recoveryScore','Recuperación %'],['catalogScore','Catálogo %'],['prospectingScore','Prospección %'],['overdueScore','Cartera %'],['metaMin','Meta mínima'],['salesActual','Venta real'],['visits','Visitas'],['recovered','Productos recup.'],['catalog','Nuevos prod.'],['prospects','Prospectos'],['overdue','Cartera vencida']], { formatters: scoreFormatters(), scroll: true })}<p class="footnote">El puntaje usa los pesos configurados: Ventas ${settings.weights.sales}%, Visitas ${settings.weights.visits}%, Recuperación ${settings.weights.recovery}%, Catálogo ${settings.weights.catalog}%, Prospección ${settings.weights.prospecting}%, Cartera ${settings.weights.overdue}%.</p></div>`;
}
function scoreFormatters(){ return { score: v => `<span class="pill ${statusClass(v)}">${pct(v)}</span>`, salesScore:pct, visitScore:pct, recoveryScore:pct, catalogScore:pct, prospectingScore:pct, overdueScore:pct, metaMin:money, salesActual:money, overdue:money }; }

function sales(){
  const rows = DATA.agents.filter(a => currentAgents().includes(a)).map(agent => {
    const m = metricForAgent(agent) || blankMetric(agent);
    const min = targetMin(agent), max = targetMax(agent);
    const actualRaw = salesActuals[agent];
    const hasActual = actualRaw !== undefined && actualRaw !== null && actualRaw !== '';
    const actual = hasActual ? Number(actualRaw) : '';
    return { agent, metaMin:min, metaMax:max, salesActual:actual, progress: min && hasActual ? actual / min * 100 : null, missing: min && hasActual ? Math.max(0, min - actual) : null, qtyMay:m.qtyMay || 0, clientsMay:m.clientsMay || 0 };
  });
  const totalActual = rows.reduce((a,r) => a + (Number(r.salesActual) || 0), 0);
  const totalMin = rows.reduce((a,r) => a + (Number(r.metaMin) || 0), 0);
  const totalMax = rows.reduce((a,r) => a + (Number(r.metaMax) || 0), 0);
  const totalProgress = totalMin ? totalActual / totalMin * 100 : null;
  state.currentRows = rows;
  return `<div class="grid cols-3">
    ${kpiCard('Venta real cargada', money(totalActual), `Meta mínima: ${money(totalMin)} · Avance: ${pct(totalProgress)}`, totalProgress)}
    ${kpiCard('Meta máxima', money(totalMax), `Periodo activo: ${activeMonthName()}`, null)}
    ${kpiCard('Vendedores/rutas', fmt(rows.length), `${rows.filter(r => Number(r.salesActual) > 0).length} con venta cargada`, null)}
  </div>
  <div class="card" style="margin-top:18px"><div class="section-title"><h3>Meta de ventas · ${activeMonthName()}</h3><button class="btn secondary" id="clearSales">Limpiar ventas capturadas</button></div><p class="footnote">La venta real de Mayo ya queda precargada con la información que compartiste. Cada mes puedes importar un Excel/CSV con dos columnas: <b>ALMACEN AGRUPADO</b> y <b>VENTA MES</b>, o <b>vendedor</b> y <b>venta</b>.</p>${renderTable(rows, [['agent','Vendedor'],['metaMin','Meta mínima'],['metaMax','Meta máxima'],['salesInput','Venta real'],['progress','Avance'],['missing','Faltante'],['qtyMay','Cantidad Mayo'],['clientsMay','Clientes Mayo']], { scroll:true, formatters:{ metaMin:money, metaMax:money, progress:pct, missing:money, salesInput:(v,row) => `<input class="sales-input" data-agent="${escapeHtml(row.agent)}" type="number" min="0" step="1" value="${salesActuals[row.agent] || ''}" placeholder="Venta $" />` } })}<div class="card inner-card"><h3>Importar ventas del mes</h3><div class="form-row"><div class="field"><label>Archivo de ventas</label><input id="salesFile" type="file" accept=".xls,.html,.csv,.txt,.json" /></div><div class="field"><label>Pegar desde Excel</label><textarea id="salesPaste" class="textarea" placeholder="ALMACEN AGRUPADO\tVENTA MES\nGDL6 - DANIEL  AGUILAR\t5209577"></textarea></div><div class="field"><label>Ayuda</label><p class="footnote">Acepta .xls tipo HTML exportado por Excel, .csv, .txt o pegado directo. Si tu archivo viene en .xlsx, guárdalo como CSV o .xls antes de cargarlo.</p></div><div><button class="btn" id="importSalesFile">Importar archivo</button><br><button class="btn secondary" id="importSales" style="margin-top:8px">Importar texto pegado</button></div></div></div></div>`;
}
function bindSales(){
  document.querySelectorAll('.sales-input').forEach(inp => inp.onchange = () => { salesActuals[inp.dataset.agent] = Number(inp.value) || ''; saveJSON(LS.sales, salesActuals); render(); });
  const pasteBtn = document.getElementById('importSales');
  if(pasteBtn) pasteBtn.onclick = () => { importSalesRows(parseAny(document.getElementById('salesPaste').value)); };
  const fileBtn = document.getElementById('importSalesFile');
  if(fileBtn) fileBtn.onclick = () => {
    const file = document.getElementById('salesFile')?.files?.[0];
    if(!file) return alert('Selecciona el archivo de ventas del mes.');
    if(/\.xlsx$/i.test(file.name)) return alert('Este importador lee CSV, TXT, JSON o .xls HTML. Guarda tu Excel como CSV o .xls y vuelve a cargarlo.');
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const txt = String(reader.result || '');
        const rows = (/^\s*</.test(txt) || /<table[\s>]/i.test(txt)) ? parseHTMLTable(txt) : parseAny(txt);
        importSalesRows(rows);
      }catch(e){ alert('No se pudo importar ventas: ' + e.message); }
    };
    reader.onerror = () => alert('No se pudo leer el archivo.');
    reader.readAsText(file, 'utf-8');
  };
  const c = document.getElementById('clearSales');
  if(c) c.onclick = () => { if(confirm('¿Limpiar ventas reales capturadas?')){ salesActuals = {}; saveJSON(LS.sales, salesActuals); render(); } };
}
function cleanNumber(v){
  if(v === null || v === undefined) return 0;
  const s = String(v).replace(/\s/g,'').replace(/\$/g,'').replace(/,/g,'');
  return Number(s) || 0;
}
function pickField(row, names){
  for(const n of names){
    if(row[n] !== undefined && row[n] !== '') return row[n];
    const key = Object.keys(row).find(k => norm(k) === norm(n));
    if(key && row[key] !== '') return row[key];
  }
  return '';
}
function importSalesRows(rows){
  let ok = 0, skipped = 0;
  (rows || []).forEach(r => {
    const vendedor = pickField(r, ['ALMACEN AGRUPADO','vendedor','Vendedor','agent','AGENTE','ALMACEN','0']) || r[0];
    const venta = pickField(r, ['VENTA MES','venta','Venta','sales','importe','subtotal','1']) || r[1];
    const a = findAgent(vendedor);
    const v = cleanNumber(venta);
    if(a && v >= 0){ salesActuals[a] = v; ok++; } else skipped++;
  });
  saveJSON(LS.sales, salesActuals);
  alert(`Ventas importadas: ${ok}${skipped ? ` · Registros no reconocidos: ${skipped}` : ''}`);
  render();
}

function visitsView(){
  const rows = visitSummaryRows();
  state.currentRows = rows;
  const vr = visitDateRange(visitsForCurrentAgent());
  const matched = visitsMatchedToAgents().length;
  return `<div class="grid cols-3">
    ${kpiCard('Visitas importadas', fmt(visits.length), vr ? `${vr.from} a ${vr.to}` : 'Carga un Excel de visitas', null)}
    ${kpiCard('Visitas GDL reconocidas', fmt(matched), 'Sólo vendedores del ranking actual', null)}
    ${kpiCard('Meta mensual por vendedor', fmt(settings.goals.monthlyVisits), `Meta semanal: ${fmt(settings.goals.weeklyVisits)}`, null)}
  </div>
  <div class="card" style="margin-top:18px">
    <div class="section-title"><h3>Importar visitas desde Excel</h3><span class="pill info">Acepta .xls HTML, .csv, .txt</span></div>
    <div class="form-row">
      <div class="field"><label>Archivo de visitas del mes</label><input id="visitsFile" type="file" accept=".xls,.html,.csv,.txt,.json" /></div>
      <div class="field"><label>Formato esperado</label><p class="footnote">Columnas compatibles: day/fecha/date, city/ciudad, vendor/vendedor/agent, client/cliente, type/tipo, notes/notas, duration_sec o duracion_min. El archivo que exporta tu app de visitas como .xls se lee directo.</p></div>
      <div><button class="btn" id="importVisitsFile">Importar Excel</button> <button class="btn secondary" id="clearVisits">Limpiar visitas</button></div>
    </div>
    <p class="footnote">La carga se guarda en este navegador. Cada mes puedes importar el Excel nuevo y se recalcula el avance de visitas automáticamente.</p>
  </div>
  <div class="card" style="margin-top:18px"><div class="section-title"><h3>Avance de visitas por vendedor</h3><span class="pill info">Meta mensual: ${fmt(settings.goals.monthlyVisits)} visitas</span></div>${renderTable(rows, [['agent','Vendedor'],['visits','Visitas'],['clients','Clientes únicos'],['progress','Avance'],['weeklyGoal','Meta semanal'],['monthlyGoal','Meta mensual']], { scroll:true, formatters:{ progress:pct } })}</div>
  <div class="card" style="margin-top:18px"><div class="section-title"><h3>Detalle de visitas cargadas</h3><button class="btn secondary" data-action="export" data-export-key="visits" data-name="visitas_cargadas.csv">Exportar detalle</button></div>${renderSearchBlock('Buscar visita/vendedor/cliente/tipo')}${renderTable(visitsForCurrentAgent(), [['date','Fecha'],['agent','Vendedor ranking'],['rawVendor','Vendedor archivo'],['client','Cliente'],['type','Tipo'],['city','Ciudad'],['durationMin','Min.'],['notes','Notas']], { limit:1200, scroll:true })}</div>`;
}
function bindVisits(){
  const importBtn = document.getElementById('importVisitsFile');
  if(importBtn) importBtn.onclick = () => {
    const file = document.getElementById('visitsFile')?.files?.[0];
    if(!file) return alert('Selecciona el archivo Excel de visitas.');
    if(/\.xlsx$/i.test(file.name)) return alert('Este importador lee el .xls que exporta tu app de visitas, CSV, TXT o JSON. Si tu archivo es .xlsx, guárdalo como .xls HTML o CSV y vuelve a cargarlo.');
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = parseVisitsFileText(String(reader.result || ''), file.name);
        visits = normalizeVisits(parsed);
        saveJSON(LS.visits, visits);
        alert(`Visitas importadas: ${visits.length}`);
        render();
      }catch(e){ alert('No se pudo importar el archivo: ' + e.message); }
    };
    reader.onerror = () => alert('No se pudo leer el archivo.');
    reader.readAsText(file, 'utf-8');
  };
  const clear = document.getElementById('clearVisits');
  if(clear) clear.onclick = () => { if(confirm('¿Limpiar visitas cargadas en este navegador?')){ visits = []; saveJSON(LS.visits, visits); render(); } };
}
function parseVisitsFileText(txt, fileName){
  const trimmed = txt.trim();
  if(!trimmed) return [];
  if(/^</.test(trimmed) || /<table[\s>]/i.test(trimmed)) return parseHTMLTable(trimmed);
  return parseAny(trimmed);
}
function parseHTMLTable(html){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if(!table) throw new Error('No encontré una tabla dentro del archivo.');
  const trs = Array.from(table.querySelectorAll('tr'));
  const matrix = trs.map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => td.textContent.trim()));
  if(matrix.length < 2) return [];
  const headers = matrix[0].map(h => h.trim());
  return matrix.slice(1).filter(r => r.some(Boolean)).map(r => { const o = {}; headers.forEach((h, i) => o[h] = r[i] ?? ''); return o; });
}
function normalizeVisits(arr){
  return (arr || []).map(r => {
    const rawDate = r.date || r.fecha || r.day || r.Fecha || r.start_ts || r.created_at || '';
    const date = String(rawDate).slice(0,10);
    const vendor = r.agent || r.vendedor || r.vendor || r.Vendedor || r.seller || r.rawVendor || '';
    const agent = findAgent(vendor) || vendor;
    const client = r.client || r.cliente || r.customer || r.Cliente || '';
    const type = r.type || r.tipo || r.Tipo || '';
    const city = r.city || r.ciudad || r.Ciudad || '';
    const notes = r.notes || r.notas || r.Notes || r.observaciones || '';
    const durationMin = r.durationMin || r.duracion_min || r.duration_min || r['duracion min'] || (r.duration_sec ? Math.round(Number(r.duration_sec) / 60) : '');
    return { date, agent, rawVendor: vendor, client, type, city, durationMin, notes };
  }).filter(r => r.date && r.agent);
}
function visitsMatchedToAgents(){ return visits.filter(r => DATA.agents.some(a => matchAgent(r.agent, a))); }
function countVisitsForAgents(agents){
  const rows = visits.filter(r => agents.some(a => matchAgent(r.agent, a)));
  return { count: rows.length, clients: new Set(rows.map(r => norm(r.client))).size };
}
function visitSummaryRows(){
  return DATA.agents.filter(a => currentAgents().includes(a)).map(a => { const c = countVisitsForAgents([a]); return { agent:a, visits:c.count, clients:c.clients, progress: visits.length ? c.count / settings.goals.monthlyVisits * 100 : null, weeklyGoal:settings.goals.weeklyVisits, monthlyGoal:settings.goals.monthlyVisits }; });
}
function visitsForCurrentAgent(){ return visits.filter(r => state.agent === '__ALL__' || matchAgent(r.agent, state.agent)); }
function visitDateRange(rows){
  const dates = rows.map(r => r.date).filter(Boolean).sort();
  return dates.length ? { from:dates[0], to:dates[dates.length - 1] } : null;
}

function recovery(){
  const rows = metricRows().map(m => ({ agent:m.agent, recovered:m.recovered || 0, recoveredClients:m.recoveredClients || 0, lostPotential:m.lostPotential || 0, lostClients:m.lostClients || 0, recoveryRate:m.recoveryRate, qtyRecovered:m.qtyRecovered || 0 }));
  state.currentRows = rows;
  const rec = sum(rows, 'recovered'), lost = sum(rows, 'lostPotential');
  const rate = (rec + lost) ? rec / (rec + lost) * 100 : 0;
  const recoveredRows = DATA.recoveredProducts.filter(r => currentAgents().includes(r.agent));
  const lostRows = DATA.lostProducts.filter(r => currentAgents().includes(r.agent));
  return `<div class="grid cols-3">${kpiCard('Productos recuperados', fmt(rec), `${fmt(sum(rows, 'recoveredClients'))} clientes`, null)}${kpiCard('Pendientes por recuperar', fmt(lost), `${fmt(sum(rows, 'lostClients'))} clientes con historial`, null)}${kpiCard('Tasa recuperación', pct(rate), 'Recuperados / potencial total', rate)}</div><div class="grid cols-2" style="margin-top:18px"><div class="card"><h3>Recuperados por categoría</h3>${renderTable(categorySummary(recoveredRows, 'qtyMay'), [['category','Categoría'],['items','Productos'],['clients','Clientes'],['qty','Cantidad']], { scroll:true })}</div><div class="card"><h3>Pendientes por recuperar por categoría</h3>${renderTable(categorySummary(lostRows, 'qtyPrior'), [['category','Categoría'],['items','Productos'],['clients','Clientes'],['qty','Cantidad historial']], { scroll:true })}</div></div><div class="card" style="margin-top:18px"><h3>Resumen por vendedor</h3>${renderTable(rows, [['agent','Vendedor'],['recovered','Productos recuperados'],['recoveredClients','Clientes'],['lostPotential','Pendientes'],['lostClients','Clientes pendientes'],['recoveryRate','% recuperación'],['qtyRecovered','Cantidad recuperada']], { scroll:true, formatters:{ recoveryRate:pct } })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Detalle productos recuperados</h3><button class="btn secondary" data-action="export" data-export-key="recovered" data-name="recuperacion_productos.csv">Exportar</button></div>${renderSearchBlock('Buscar cliente/producto/categoría')}${renderTable(recoveredRows, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['category','Categoría'],['product','Producto'],['qtyMay','Cantidad Mayo'],['lastMonth','Último mes antes de abril']], { limit:1000, scroll:true })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Potencial pendiente por recuperar</h3><button class="btn secondary" data-action="export" data-export-key="lost" data-name="pendiente_recuperar.csv">Exportar</button></div>${renderTable(lostRows, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['category','Categoría'],['product','Producto'],['qtyPrior','Cantidad historial'],['lastMonth','Último mes vendido']], { limit:1000, scroll:true })}</div>`;
}

function catalog(){
  const rows = metricRows().map(m => ({ agent:m.agent, catalogIncrements:m.catalogIncrements || 0, catalogClients:m.catalogClients || 0, qtyCatalog:m.qtyCatalog || 0, goal:settings.goals.catalogIncrements, progress: settings.goals.catalogIncrements ? (m.catalogIncrements || 0) / settings.goals.catalogIncrements * 100 : null }));
  const incRows = DATA.catalogIncrements.filter(r => currentAgents().includes(r.agent));
  const coverage = buildCoverageRows();
  const prodRows = DATA.clientProductCategoryDetail.filter(r => currentAgents().includes(r.agent));
  const avgCoverage = coverage.length ? coverage.reduce((s, r) => s + Number(r.coveragePct || 0), 0) / coverage.length : 0;
  state.currentRows = rows;
  return `<div class="grid cols-3">${kpiCard('Incrementos de catálogo', fmt(sum(rows, 'catalogIncrements')), `${fmt(sum(rows, 'catalogClients'))} clientes`, null)}${kpiCard('Cobertura promedio', pct(avgCoverage), `${fmt(categoryTargets.length)} categorías objetivo`, avgCoverage)}${kpiCard('Clientes revisados', fmt(coverage.length), 'clientes con compra en Mayo', null)}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Incremento de catálogo por vendedor</h3><span class="pill info">Meta editable: ${fmt(settings.goals.catalogIncrements)} productos nuevos</span></div>${renderTable(rows, [['agent','Vendedor'],['catalogIncrements','Productos nuevos'],['catalogClients','Clientes con incremento'],['qtyCatalog','Cantidad nuevos'],['goal','Meta'],['progress','Avance']], { scroll:true, formatters:{ progress:pct } })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Detalle incremento de catálogo</h3><button class="btn secondary" data-action="export" data-export-key="catalog" data-name="incremento_catalogo.csv">Exportar</button></div>${renderSearchBlock('Buscar cliente/producto/categoría')}${renderTable(incRows, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['category','Categoría'],['product','Producto'],['qtyMay','Cantidad Mayo']], { limit:1000, scroll:true })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Cobertura por cliente: categorías activas y faltantes</h3><button class="btn secondary" data-action="export" data-export-key="coverage" data-name="cobertura_cliente_categoria.csv">Exportar</button></div>${renderTable(coverage, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['categoryCount','Categorías'],['coveragePct','Cobertura'],['categories','Categorías activas'],['missingCategories','Categorías faltantes'],['productsMay','Productos Mayo'],['qtyMay','Cantidad Mayo']], { limit:1000, scroll:true, formatters:{ coveragePct:pct } })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Desglose por cliente, categoría y producto</h3><button class="btn secondary" data-action="export" data-export-key="clientProducts" data-name="desglose_cliente_categoria_producto.csv">Exportar</button></div>${renderTable(prodRows, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['category','Categoría'],['product','Producto'],['qtyMay','Cantidad Mayo']], { limit:1500, scroll:true })}</div>`;
}

function prospecting(){
  const rows = metricRows().map(m => ({ agent:m.agent, newClients:m.newClients || 0, qtyProspects:m.qtyProspects || 0, goal:settings.goals.prospects, progress: settings.goals.prospects ? (m.newClients || 0) / settings.goals.prospects * 100 : null }));
  const details = DATA.prospects.filter(r => currentAgents().includes(r.agent));
  state.currentRows = rows;
  return `<div class="grid cols-2"><div class="card scroll-window"><div class="section-title"><h3>Prospección: clientes nuevos detectados</h3><span class="pill info">Meta editable: ${fmt(settings.goals.prospects)} prospectos</span></div>${renderTable(rows, [['agent','Vendedor'],['newClients','Prospectos'],['qtyProspects','Cantidad Mayo'],['goal','Meta'],['progress','Avance']], { scroll:true, formatters:{ progress:pct } })}<p class="footnote">Se considera prospecto cuando el cliente aparece con compra en Mayo y no aparece en Enero-Abril dentro del archivo de ventas desglosadas.</p></div><div class="card scroll-window"><h3>Prospectos por giro</h3>${renderTable(categoryLikeSummary(details, 'giro', 'qtyMay'), [['label','Giro'],['items','Clientes'],['qty','Cantidad Mayo']], { scroll:true })}</div></div><div class="card scroll-window" style="margin-top:18px"><div class="section-title"><h3>Detalle prospectos</h3><button class="btn secondary" data-action="export" data-export-key="prospects" data-name="prospectos_mayo.csv">Exportar</button></div>${renderSearchBlock('Buscar prospecto/giro')}${renderTable(details, [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['qtyMay','Cantidad Mayo']], { limit:1000, scroll:true })}</div>`;
}

function overdueView(){
  const rows = overdueSummaryRows();
  state.currentRows = rows;
  return `<div class="grid cols-2"><div class="card"><h3>Cargar cartera vencida</h3><div class="field"><label>Pegar CSV</label><textarea id="overduePaste" class="textarea" placeholder="vendedor,cliente,saldo_vencido,dias_vencido,fecha\nGDL6 - DANIEL  AGUILAR,Cliente ABC,4200,15,2026-06-05"></textarea></div><div style="margin-top:10px"><button class="btn" id="importOverdue">Importar cartera</button> <button class="btn secondary" id="clearOverdue">Limpiar cartera</button></div><p class="footnote">Cargar después del día 5 de cada mes. Meta por vendedor: cartera vencida máxima ${money(settings.goals.overdueMax)}.</p></div><div class="card"><h3>Regla de KPI</h3><p class="footnote">Si el saldo vencido es menor o igual a la meta permitida, el KPI se considera 100%. Si supera la meta, el score baja proporcionalmente: meta / saldo vencido.</p></div></div><div class="card" style="margin-top:18px"><h3>Resumen por vendedor</h3>${renderTable(rows, [['agent','Vendedor'],['amount','Saldo vencido'],['clients','Clientes'],['score','KPI cartera']], { scroll:true, formatters:{ amount:money, score:pct } })}</div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Detalle cartera vencida</h3><button class="btn secondary" data-action="export" data-export-key="overdue" data-name="cartera_vencida.csv">Exportar</button></div>${renderTable(overdue.filter(r => state.agent === '__ALL__' || matchAgent(r.agent, state.agent)), [['agent','Vendedor'],['client','Cliente'],['amount','Saldo vencido'],['days','Días vencido'],['date','Fecha']], { scroll:true, formatters:{ amount:money } })}</div>`;
}
function bindOverdue(){
  const imp = document.getElementById('importOverdue');
  if(imp) imp.onclick = () => { const rows = parseCSV(document.getElementById('overduePaste').value); overdue = rows.map(r => { const agent = findAgent(r.vendedor || r.agent || r.Vendedor || r[0]) || r.vendedor || r.agent || r[0] || ''; return { agent, client:r.cliente || r.client || r.Cliente || r[1] || '', amount:Number(String(r.saldo_vencido || r.amount || r.monto || r[2] || 0).replace(/[$,]/g,'')), days:Number(r.dias_vencido || r.days || r[3] || 0), date:r.fecha || r.date || r[4] || '' }; }).filter(r => r.agent && r.client); saveJSON(LS.overdue, overdue); render(); };
  const clr = document.getElementById('clearOverdue');
  if(clr) clr.onclick = () => { if(confirm('¿Limpiar cartera vencida cargada?')){ overdue = []; saveJSON(LS.overdue, overdue); render(); } };
}
function overdueTotalForAgent(agent){ return overdue.filter(r => matchAgent(r.agent, agent)).reduce((a, r) => a + (Number(r.amount) || 0), 0); }
function overdueScore(amount, agentCount = 1){ const allowed = (Number(settings.goals.overdueMax) || 0) * agentCount; if(amount <= allowed) return 100; return clamp(allowed / amount * 100); }
function overdueSummaryRows(){ return DATA.agents.filter(a => currentAgents().includes(a)).map(a => { const rows = overdue.filter(r => matchAgent(r.agent, a)); const amount = sum(rows, 'amount'); return { agent:a, amount, clients:new Set(rows.map(r => norm(r.client))).size, score:overdue.length ? overdueScore(amount, 1) : null }; }); }

function giro(){
  const rows = DATA.giroByAgent.filter(r => currentAgents().includes(r.agent));
  state.currentRows = rows;
  const top = [...rows].sort((a, b) => (b.qtyMay || 0) - (a.qtyMay || 0)).slice(0, 12);
  return `<div class="grid cols-2"><div class="card"><div class="section-title"><h3>Venta por giro en cantidades</h3><span class="muted small">${activeMonthName()}</span></div>${barList(top, 'giro', 'qtyMay')}</div><div class="card"><h3>Clientes por giro</h3>${renderTable(DATA.clientSummary.filter(r => currentAgents().includes(r.agent)), [['agent','Vendedor'],['client','Cliente'],['giro','Giro'],['qtyMay','Cantidad Mayo'],['productsMay','Productos Mayo']], { limit:500, scroll:true })}</div></div><div class="card" style="margin-top:18px"><div class="section-title"><h3>Archivo giro de clientes</h3><button class="btn secondary" data-action="export" data-export-key="giro" data-name="giro_clientes.csv">Exportar</button></div>${renderSearchBlock('Buscar cliente/giro')}${renderTable(DATA.giroClients, [['codigo','Código'],['cliente','Cliente'],['giro','Giro'],['subtotal','Subtotal Ene-May'],['pct','% total']], { limit:1000, scroll:true, formatters:{ subtotal:money, pct:v => pct(Number(v) * 100) } })}</div>`;
}

function config(){
  const w = settings.weights, g = settings.goals;
  const targetRows = DATA.agents.map(agent => ({ agent, min:targetMin(agent) || '', max:targetMax(agent) || '' }));
  return `<div class="grid cols-2"><div class="card"><h3>Periodo activo</h3><div class="config-grid"><div class="field"><label>Mes</label><input id="periodMonth" type="month" value="${escapeHtml(activeMonth())}"></div><div class="field"><label>Nombre para reportes</label><input id="periodMonthName" type="text" value="${escapeHtml(activeMonthName())}" placeholder="Junio 2026"></div></div><p class="footnote">Al cambiar el periodo, se mantiene el mismo diseño. Sólo actualizas metas y ventas del mes.</p></div><div class="card"><h3>Pesos del ranking</h3><div class="config-grid">${Object.keys(w).map(k => `<div class="field"><label>${labelWeight(k)}</label><input class="weight-input" data-key="${k}" type="number" value="${w[k]}" min="0" max="100"></div>`).join('')}</div><p class="footnote">La suma recomendada es 100%. Total actual: <b>${fmt(Object.values(w).reduce((a, b) => a + Number(b || 0), 0))}%</b></p><div class="field"><label>Modo de puntaje</label><select id="scoreMode"><option value="available" ${settings.scoreMode === 'available' ? 'selected' : ''}>Sólo KPIs con datos disponibles</option><option value="strict" ${settings.scoreMode === 'strict' ? 'selected' : ''}>Ranking completo: pendientes cuentan como 0</option></select></div></div></div>
  <div class="grid cols-2" style="margin-top:18px"><div class="card"><h3>Metas KPI</h3><div class="config-grid">${Object.keys(g).map(k => `<div class="field"><label>${labelGoal(k)}</label><input class="goal-input" data-key="${k}" type="number" value="${g[k]}" min="0"></div>`).join('')}</div><button class="btn" id="saveConfig" style="margin-top:14px">Guardar configuración</button> <button class="btn secondary" id="resetConfig" style="margin-top:14px">Restablecer</button></div><div class="card"><h3>Resumen de configuración</h3><p class="footnote"><b>Ventas:</b> se cargan en Meta de Ventas.<br><b>Metas:</b> se editan abajo por vendedor/ruta.<br><b>Visitas:</b> 25 semanales / 100 mensuales por vendedor, editable aquí.</p></div></div>
  <div class="card" style="margin-top:18px"><div class="section-title"><h3>Metas de venta por vendedor · editable cada mes</h3><span class="pill info">Formato fijo</span></div>${renderTable(targetRows, [['agent','Vendedor'],['targetMinInput','Meta mínima'],['targetMaxInput','Meta máxima']], { scroll:true, formatters:{ targetMinInput:(v,row) => `<input class="target-min-input" data-agent="${escapeHtml(row.agent)}" type="number" value="${row.min}" placeholder="Meta mínima" />`, targetMaxInput:(v,row) => `<input class="target-max-input" data-agent="${escapeHtml(row.agent)}" type="number" value="${row.max}" placeholder="Meta máxima" />` } })}<div class="form-row"><div class="field"><label>Archivo de metas</label><input id="targetsFile" type="file" accept=".xls,.html,.csv,.txt,.json" /></div><div class="field"><label>Pegar metas desde Excel</label><textarea id="targetsPaste" class="textarea" placeholder="vendedor\tmeta_minima\tmeta_maxima\nGDL6 - DANIEL  AGUILAR\t2717810\t2989591"></textarea></div><div><button class="btn" id="importTargetsFile">Importar archivo</button><br><button class="btn secondary" id="importTargets" style="margin-top:8px">Importar texto pegado</button></div></div><p class="footnote">Cada mes puedes actualizar meta mínima y máxima sin modificar el diseño de la app.</p></div>
  <div class="card" style="margin-top:18px"><h3>Categorías objetivo para cobertura de clientes</h3><div class="field"><label>Una categoría por línea</label><textarea id="categoriesText" class="textarea small-textarea">${escapeHtml(categoryTargets.join('\n'))}</textarea></div><p class="footnote">Estas categorías se usan para identificar faltantes por cliente. El producto ya viene clasificado automáticamente en el desglose.</p></div><div class="card" style="margin-top:18px"><h3>Estructura esperada para integraciones</h3><p class="footnote"><b>Visitas Excel/CSV:</b> fecha/day/date, vendedor/vendor/agent, cliente/client, tipo/type, ciudad/city, notas/notes, duracion_min o duration_sec.<br><b>Cartera vencida:</b> vendedor, cliente, saldo_vencido, dias_vencido, fecha.<br><b>Venta real:</b> ALMACEN AGRUPADO + VENTA MES, o vendedor + venta.<br><b>Metas:</b> vendedor + meta_minima + meta_maxima.</p></div>`;
}
function bindConfig(){
  document.getElementById('saveConfig').onclick = () => {
    settings.period = settings.period || {};
    settings.period.month = document.getElementById('periodMonth').value || DATA.meta.month;
    settings.period.monthName = document.getElementById('periodMonthName').value || DATA.meta.monthName;
    document.querySelectorAll('.weight-input').forEach(i => settings.weights[i.dataset.key] = Number(i.value) || 0);
    document.querySelectorAll('.goal-input').forEach(i => settings.goals[i.dataset.key] = Number(i.value) || 0);
    settings.scoreMode = document.getElementById('scoreMode').value;
    document.querySelectorAll('.target-min-input').forEach(i => { salesTargets[i.dataset.agent] = salesTargets[i.dataset.agent] || {}; salesTargets[i.dataset.agent].min = Number(i.value) || null; });
    document.querySelectorAll('.target-max-input').forEach(i => { salesTargets[i.dataset.agent] = salesTargets[i.dataset.agent] || {}; salesTargets[i.dataset.agent].max = Number(i.value) || null; });
    categoryTargets = document.getElementById('categoriesText').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    saveJSON(LS.settings, settings); saveJSON(LS.targets, salesTargets); saveJSON(LS.categories, categoryTargets);
    render();
  };
  document.getElementById('resetConfig').onclick = () => { settings = clone(DATA.defaults); salesTargets = clone(DATA.salesTargets || DATA.defaults.salesTargets || {}); categoryTargets = clone(DATA.categories || DATA.defaults.categories || []); saveJSON(LS.settings, settings); saveJSON(LS.targets, salesTargets); saveJSON(LS.categories, categoryTargets); render(); };
  const imp = document.getElementById('importTargets');
  if(imp) imp.onclick = () => { importTargetRows(parseAny(document.getElementById('targetsPaste').value)); };
  const impFile = document.getElementById('importTargetsFile');
  if(impFile) impFile.onclick = () => {
    const file = document.getElementById('targetsFile')?.files?.[0];
    if(!file) return alert('Selecciona el archivo de metas del mes.');
    if(/\.xlsx$/i.test(file.name)) return alert('Este importador lee CSV, TXT, JSON o .xls HTML. Guarda tu Excel como CSV o .xls y vuelve a cargarlo.');
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const txt = String(reader.result || '');
        const rows = (/^\s*</.test(txt) || /<table[\s>]/i.test(txt)) ? parseHTMLTable(txt) : parseAny(txt);
        importTargetRows(rows);
      }catch(e){ alert('No se pudo importar metas: ' + e.message); }
    };
    reader.onerror = () => alert('No se pudo leer el archivo.');
    reader.readAsText(file, 'utf-8');
  };
}
function importTargetRows(rows){
  let ok = 0, skipped = 0;
  (rows || []).forEach(r => {
    const vendedor = pickField(r, ['vendedor','Vendedor','agent','AGENTE','ALMACEN AGRUPADO','0']) || r[0];
    const min = pickField(r, ['meta_minima','META MÍNIMA','META MINIMA','min','Meta mínima','1']) || r[1];
    const max = pickField(r, ['meta_maxima','META MÁXIMA','META MAXIMA','max','Meta máxima','2']) || r[2];
    const a = findAgent(vendedor);
    if(a){ salesTargets[a] = salesTargets[a] || {}; salesTargets[a].min = cleanNumber(min) || null; salesTargets[a].max = cleanNumber(max) || null; ok++; } else skipped++;
  });
  saveJSON(LS.targets, salesTargets);
  alert(`Metas importadas: ${ok}${skipped ? ` · Registros no reconocidos: ${skipped}` : ''}`);
  render();
}

function labelWeight(k){ return ({ sales:'Meta Ventas', visits:'Visitas', recovery:'Recuperación', catalog:'Catálogo', prospecting:'Prospección', overdue:'Cartera' })[k] || k; }
function labelGoal(k){ return ({ weeklyVisits:'Visitas semanales', monthlyVisits:'Visitas mensuales', catalogIncrements:'Meta nuevos productos', prospects:'Meta prospectos', overdueMax:'Máx. cartera vencida' })[k] || k; }

function buildCoverageRows(){
  const map = new Map();
  const agents = currentAgents();
  const details = DATA.clientProductCategoryDetail.filter(r => agents.includes(r.agent));
  for(const r of details){
    const key = `${r.agent}||${r.client}`;
    if(!map.has(key)) map.set(key, { agent:r.agent, client:r.client, giro:r.giro, qtyMay:0, productsMay:0, cats:new Set() });
    const o = map.get(key);
    o.qtyMay += Number(r.qtyMay) || 0;
    o.productsMay += 1;
    o.cats.add(r.category || 'Sin categoría');
  }
  return Array.from(map.values()).map(o => {
    const cats = Array.from(o.cats).sort((a, b) => categoryOrder(a) - categoryOrder(b));
    const missing = categoryTargets.filter(c => !o.cats.has(c));
    return { agent:o.agent, client:o.client, giro:o.giro, qtyMay:o.qtyMay, productsMay:o.productsMay, categoryCount:cats.length, categories:cats.join(', '), missingCategories:missing.join(', '), coveragePct:categoryTargets.length ? cats.filter(c => categoryTargets.includes(c)).length / categoryTargets.length * 100 : null };
  }).sort((a, b) => norm(a.agent).localeCompare(norm(b.agent)) || (b.coveragePct || 0) - (a.coveragePct || 0) || (b.qtyMay || 0) - (a.qtyMay || 0));
}
function categoryOrder(c){ const i = categoryTargets.indexOf(c); return i >= 0 ? i : 999; }
function categorySummary(rows, qtyKey){
  const m = new Map();
  for(const r of rows){ const cat = r.category || 'Sin categoría'; if(!m.has(cat)) m.set(cat, { category:cat, items:0, clientsSet:new Set(), qty:0 }); const o = m.get(cat); o.items += 1; o.clientsSet.add(norm(r.client)); o.qty += Number(r[qtyKey]) || 0; }
  return Array.from(m.values()).map(o => ({ category:o.category, items:o.items, clients:o.clientsSet.size, qty:o.qty })).sort((a,b) => b.items - a.items);
}
function categoryLikeSummary(rows, key, qtyKey){
  const m = new Map();
  for(const r of rows){ const label = r[key] || 'Sin dato'; if(!m.has(label)) m.set(label, { label, items:0, qty:0 }); const o = m.get(label); o.items += 1; o.qty += Number(r[qtyKey]) || 0; }
  return Array.from(m.values()).sort((a,b) => b.items - a.items);
}

function rowsForExport(key){
  const agents = currentAgents();
  const byAgent = rows => rows.filter(r => !r.agent || agents.includes(r.agent));
  if(key === 'visits') return visitsForCurrentAgent();
  if(key === 'recovered') return byAgent(DATA.recoveredProducts);
  if(key === 'lost') return byAgent(DATA.lostProducts);
  if(key === 'catalog') return byAgent(DATA.catalogIncrements);
  if(key === 'coverage') return buildCoverageRows();
  if(key === 'clientProducts') return byAgent(DATA.clientProductCategoryDetail);
  if(key === 'prospects') return byAgent(DATA.prospects);
  if(key === 'overdue') return overdue.filter(r => state.agent === '__ALL__' || matchAgent(r.agent, state.agent));
  if(key === 'giro') return DATA.giroClients;
  return state.currentRows;
}

const AGENT_STOPWORDS = new Set(['GDL','RUTA','OFICINA','CLAVE','AGENTE','DE','DEL','LA','LAS','LOS','EL','Y','A']);
const AGENT_ALIASES = {
  'YEPEZ MORA OSCAR ALBERTO':'GDL1 - OSCAR YEPEZ',
  'AGUILAR NERI DANIEL':'GDL6 - DANIEL  AGUILAR',
  'DE LA CRUZ PONCE JULIO CESAR':'GDL4 - JULIO DE LA CRUZ',
  'PEREZ MAR ALAN ROBERTO':'GDL5 - ALAN PEREZ',
  'REYNOSO AGUILAR MARICELA':'GDL3 - MARICELA REYNOSO',
  'SIERRA DE ANDA ALDO':'GDL15 - ALDO SIERRA',
  'VELEZ CASTELLANOS ANTONIO':'GDL9 - ANTONIO V.',
  'AGUIRRE OJEDA ARCENIO':'GDL14- ARCENIO AGUIRRE',
  'NAVARRO NAVARRO SANDRA':'GDL13 - SANDRA NAVARRO',
  'SANDRA NAVARRO NAVARRO':'GDL13 - SANDRA NAVARRO',
  'GARIBAY ORTIZ SERGIO JOEL':'AGENTE CLAVE  GDL',
  'SANCHEZ ESMERALDA':'OFICINA GDL'
};
function agentTokens(txt){ return norm(txt).split(' ').filter(w => w.length > 1 && !AGENT_STOPWORDS.has(w) && !/^\d+$/.test(w)); }
function findAgent(txt){
  const n = norm(txt); if(!n) return null;
  if(AGENT_ALIASES[n]) return AGENT_ALIASES[n];
  let exact = DATA.agents.find(a => norm(a) === n); if(exact) return exact;
  exact = DATA.agents.find(a => n.includes(norm(a)) || norm(a).includes(n)); if(exact) return exact;
  const inputTokens = agentTokens(n);
  let best = null, bestScore = 0, bestHits = 0;
  for(const a of DATA.agents){
    const at = agentTokens(a).filter(t => t !== 'GDL');
    if(!at.length) continue;
    const hits = at.filter(t => inputTokens.includes(t)).length;
    const score = hits / at.length;
    if(score > bestScore || (score === bestScore && hits > bestHits)){ best = a; bestScore = score; bestHits = hits; }
  }
  return bestScore >= 0.8 ? best : null;
}
function matchAgent(a, b){ const fa = findAgent(a) || a; const fb = findAgent(b) || b; return norm(fa) === norm(fb); }
function renderSearchBlock(ph){ return `<div class="search-row"><input id="tableSearch" placeholder="${escapeHtml(ph)}" /><span class="muted small">La búsqueda filtra la tabla visible.</span></div>`; }
function renderSearchableTable(search){ const term = norm(search.value); const scope = search.closest('.card') || document; scope.querySelectorAll('tbody tr').forEach(tr => { tr.style.display = !term || norm(tr.textContent).includes(term) ? '' : 'none'; }); }
function renderTable(rows, cols, opts = {}){
  const limit = opts.limit || rows.length;
  const formatters = opts.formatters || {};
  const view = rows.slice(0, limit);
  const wrapClass = `table-wrap ${opts.scroll ? 'scroll-panel' : ''}`;
  return `<div class="${wrapClass}"><table><thead><tr>${cols.map(c => `<th>${escapeHtml(c[1])}</th>`).join('')}</tr></thead><tbody>${view.map(r => `<tr>${cols.map(c => { const key = c[0]; let val = (key === 'salesInput' || key === 'targetMinInput' || key === 'targetMaxInput') ? '' : r[key]; let out = formatters[key] ? formatters[key](val, r) : defaultFormat(val, key); const cls = (typeof val === 'number' || key.toLowerCase().includes('score') || key.toLowerCase().includes('progress') || key.toLowerCase().includes('qty') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('meta') || key.toLowerCase().includes('coverage')) ? 'num' : ''; return `<td class="${cls}">${out}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>${rows.length > limit ? `<p class="footnote">Mostrando ${fmt(limit)} de ${fmt(rows.length)} registros. Usa exportar CSV para bajar todo.</p>` : ''}`;
}
function defaultFormat(v, key){ if(v === null || v === undefined || v === '') return '<span class="muted">Pend.</span>'; if(key.toLowerCase().includes('pct')) return pct(v); if(key.toLowerCase().includes('score') || key.toLowerCase().includes('progress') || key.toLowerCase().includes('coverage')) return pct(v); if(key.toLowerCase().includes('amount') || key.toLowerCase().includes('meta') || key.toLowerCase().includes('salesactual')) return money(v); if(typeof v === 'number') return fmt(v, v % 1 ? 2 : 0); return escapeHtml(v); }
function parseAny(txt){ txt = txt.trim(); if(!txt) return []; if(txt[0] === '[' || txt[0] === '{'){ const js = JSON.parse(txt); return Array.isArray(js) ? js : (js.data || js.visits || []); } return parseCSV(txt); }
function parseCSV(txt){
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  if(!lines.length) return [];
  const first = lines[0];
  const delimiter = (first.match(/\t/g) || []).length ? '\t' : ((first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',');
  const parseLine = line => { const out = []; let cur = '', q = false; for(let i = 0; i < line.length; i++){ const ch = line[i]; if(ch === '"'){ if(q && line[i+1] === '"'){ cur += '"'; i++; } else q = !q; } else if(ch === delimiter && !q){ out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  const rows = lines.map(parseLine);
  const headers = rows[0].map(h => String(h).trim());
  const hasHeader = headers.some(h => /vendedor|agent|vendor|cliente|fecha|venta|saldo|day|meta/i.test(h));
  if(!hasHeader) return rows.map(r => Object.assign([...r], r));
  return rows.slice(1).map(r => { const o = {}; headers.forEach((h, i) => o[h] = r[i] ?? ''); return o; });
}
function exportCSV(rows, filename){
  if(!rows || !rows.length){ alert('No hay filas para exportar en esta hoja.'); return; }
  const keys = Object.keys(rows[0]).filter(k => !(rows[0][k] instanceof Set));
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => csvCell(r[k])).join(','))).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function csvCell(v){ if(v === null || v === undefined) return ''; const s = String(v).replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s; }

init();
