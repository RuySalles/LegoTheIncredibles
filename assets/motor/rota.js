// MOTOR da página da rota (rota.html). Igual em todo guia: não edite por jogo.
// Lê data/rota.json, prepara os dados de cada peça e pede o HTML ao tema (assets/tema/tema.js).
// Comportamento só pelos ganchos data-g da página.
import { esc, norm, cap, pad2, loadJSON, loadError, flash, store, read, readJSON, forget } from './util.js';
import { renderCasca, publishProgress } from './casca.js';
import { createChecklist, storeAsList, collapsible } from './checklist.js';
import { sourceIndex, srcList, renderSources } from './fontes.js';
import { exportSave, importSave, initMoreMenu } from './save.js';
import padrao from './padrao.js';
import tema from '../tema/tema.js';
import { PREFIX } from '../guia.config.js';

const t = { ...padrao, ...tema };
const g = name => document.querySelector(`[data-g="${name}"]`);
const gAll = name => [...document.querySelectorAll(`[data-g="${name}"]`)];
const fill = (name, html) => gAll(name).forEach(el => { el.innerHTML = html; });
const hide = (name, hidden = true) => gAll(name).forEach(el => { el.hidden = hidden; });

// Chaves de armazenamento — NÃO alterar depois de publicar, para manter o progresso já salvo.
const STORAGE_KEY = PREFIX + '-route-checklist-v1';
const HIDE_KEY = PREFIX + '-route-hide-done-v1';
const VIEW_KEY = PREFIX + '-route-stage-view-v1';   // etapas que o usuário abriu/fechou na mão: { "3": "open" | "closed" }
const TAB_KEY = PREFIX + '-route-tab-v1';
const MAT_KEY = PREFIX + '-route-materials-v1';

let data, fontes, conq;
try {
  [data, fontes, conq] = await Promise.all([loadJSON('data/rota.json'), loadJSON('data/fontes.json'), loadJSON('data/conquistas.json').catch(() => null)]);
} catch (err) { renderCasca(t, 'rota'); loadError(g('vazio') || document.body, err); throw err; }

// =====================================================================
// DADOS DERIVADOS
// =====================================================================
const ROLE = Object.fromEntries((data.tagTypes || []).map(tt => [tt.type, tt.color]));
const matName = Object.fromEntries((data.materials || []).map(m => [m.key, m.name]));
const highlight = new Set((data.materials || []).filter(m => m.highlight).map(m => m.key));
const ms = data.milestones && data.milestones.items && data.milestones.items.length ? data.milestones : null;
const srcIdx = sourceIndex(fontes);

// Partes da rota: tudo antes do primeiro "part" é a parte principal; cada "part" abre uma nova aba
const parts = [{ id: 'jornada', title: data.mainTitle || 'Jornada', stages: [] }];
data.stages.forEach((st, i) => {
  if (st.part) parts.push({ id: st.part.id, title: st.part.title, stages: [] });
  parts[parts.length - 1].stages.push(i);
});
const partOfStage = data.stages.map((_, i) => parts.find(p => p.stages.includes(i)).id);
const stageOfTask = {};
data.stages.forEach((st, i) => st.tasks.forEach(tk => { stageOfTask[tk.id] = i; }));
// Marco sem "group" pertence à parte principal; "group" é o id da parte
parts.forEach(p => { p.ms = ms ? ms.items.filter(b => (b.group || 'jornada') === p.id) : []; });
const TABS = [...parts.map(p => p.id), 'referencia'];

// Conquistas ligadas a cada tarefa (vem do campo "rota" de data/conquistas.json)
const achOfTask = {};
if (conq) Object.entries(conq.achievements).forEach(([id, a]) => (a.rota || []).forEach(tk => { (achOfTask[tk] = achOfTask[tk] || []).push([id, a]); }));

renderCasca(t, 'rota', parts);

// =====================================================================
// DADOS DE CADA PEÇA (o que o tema recebe)
// =====================================================================
function taskView(tk) {
  const fs = srcList(tk.sources, srcIdx);
  return {
    id: tk.id, titulo: tk.title, desc: tk.desc,
    etiquetas: (tk.tags || []).map(e => ({ texto: e.text, papel: (e.type && ROLE[e.type]) || '', tipo: e.type || '' })),
    conquistas: (achOfTask[tk.id] || []).map(([id, a]) => ({ id, nome: a.name, href: `index.html#ach-${esc(id)}` })),
    materiais: (tk.materials || []).map(([k, n]) => ({ chave: k, nome: matName[k], n })),
    fontes: fs, linhaFontes: t.linhaFontes(fs),
  };
}
function stageView(st, i) {
  const tarefas = st.tasks.map(taskView);
  return { id: `etapa-${pad2(i + 1)}`, n: i + 1, num: pad2(i + 1), titulo: st.title, subtitulo: st.subtitle || '', tag: st.tag || '', nota: st.note || '',
    parte: partOfStage[i], total: tarefas.length, tarefas, cartoes: tarefas.map(t.tarefa).join('\n') };
}

// Soma dos materiais das partes escolhidas (destaques primeiro; depois do mais pedido ao menos)
function materialTotals(partIds) {
  const req = {};
  data.stages.forEach((st, i) => {
    if (!partIds.includes(partOfStage[i])) return;
    st.tasks.forEach(tk => (tk.materials || []).forEach(([k, n]) => { req[k] = (req[k] || 0) + n; }));
  });
  const keys = data.materials.map(m => m.key);
  return Object.keys(req)
    .sort((a, b) => highlight.has(b) - highlight.has(a) || req[b] - req[a] || keys.indexOf(a) - keys.indexOf(b))
    .map(k => ({ chave: k, nome: cap(matName[k]), n: req[k], destaque: highlight.has(k) }));
}
function renderMaterials(choice) {
  fill('mat-grade', t.materiais(materialTotals(choice === 'tudo' ? parts.map(p => p.id) : [choice])));
  document.querySelectorAll('[data-g="mat-filtros"] [data-mat]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mat === choice)));
  store(MAT_KEY, choice);
}

function render() {
  const nTasks = data.stages.reduce((a, s) => a + s.tasks.length, 0);
  const nAch = Object.keys(achOfTask).reduce((a, k) => a + achOfTask[k].length, 0);
  fill('meta', t.metaRota({ etapas: data.stages.length, tarefas: nTasks, conquistas: nAch }));
  if (ms) {
    gAll('titulo-marcos').forEach(el => { el.textContent = ms.title || 'Marcos'; });
    fill('marcos', t.marcos(parts.filter(p => p.ms.length).map(p => ({ id: p.id, titulo: p.title,
      marcos: p.ms.map(b => ({ i: ms.items.indexOf(b), rotulo: b.label, nome: b.name, unlock: b.unlock })) }))));
    gAll('marco-detalhe').forEach(el => { el.textContent = ms.hint || 'Toque num marco para ver qual é. Eles acendem quando a tarefa que os libera é marcada.'; });
    fill('marcos-tabela', t.marcosTabela(parts.filter(p => p.ms.length).map(p => ({ id: p.id, titulo: p.title,
      marcos: p.ms.map(b => ({ nome: b.name, detalhe: b.detail || '', unlock: b.unlock, etapaNum: pad2(stageOfTask[b.unlock] + 1) })) }))));
  } else { hide('sec-marcos'); document.documentElement.setAttribute('data-sem-marcos', ''); }

  // "Como ler a rota": tipos de etiqueta com "flow" viram os passos; os demais, a legenda
  const types = data.tagTypes || [];
  const fluxo = types.filter(x => x.flow).map(x => ({ rotulo: x.label, papel: x.color, texto: x.flow }));
  const legenda = types.filter(x => !x.flow && x.explain).map(x => ({ rotulo: x.label, papel: x.color, texto: x.explain }));
  if (fluxo.length || legenda.length) fill('como-ler', t.comoLer({ fluxo, legenda, nota: data.legendNote || '' }));
  else hide('sec-como-ler');

  fill('abas', [...parts.map(p => t.aba({ id: p.id, titulo: p.title, contar: true })), t.aba({ id: 'referencia', titulo: 'Referência', contar: false })].join(''));
  fill('mapa', t.mapa(parts.map(p => ({ id: p.id, titulo: p.title, etapas: p.stages.map(i => ({ i, num: pad2(i + 1), titulo: data.stages[i].title })) }))));
  fill('etapas', data.stages.map((st, i) => (st.part ? t.divisor({ id: st.part.id, titulo: st.part.title, texto: st.part.text }) : '') + t.etapa(stageView(st, i))).join('\n'));

  if ((data.materials || []).length) {
    fill('mat-filtros', parts.length > 1 ? t.matFiltros([...parts.map(p => ({ id: p.id, titulo: p.title })), { id: 'tudo', titulo: 'Tudo' }]) : '');
    const savedMat = read(MAT_KEY);
    renderMaterials([...parts.map(p => p.id), 'tudo'].includes(savedMat) ? savedMat : (parts.length > 1 ? 'jornada' : 'tudo'));
    if (data.materialsNote) fill('mat-nota', data.materialsNote); else hide('mat-nota');
  } else hide('sec-materiais');

  const usage = {};
  data.stages.forEach(st => st.tasks.forEach(tk => (tk.sources || []).forEach(s => { usage[s] = (usage[s] || 0) + 1; })));
  renderSources(t, fontes, usage);
}

render();

// =====================================================================
// COMPORTAMENTO
// =====================================================================
const taskOf = b => b.closest('[data-g="tarefa"]');
const boxes = [...document.querySelectorAll('[data-g="tarefa"] input[data-id]')];
const byId = Object.fromEntries(boxes.map(b => [b.dataset.id, b]));
const stages = gAll('etapa');
const stageOf = b => b.closest('[data-g="etapa"]');
const unlockEls = [...document.querySelectorAll('[data-unlock]')];
const mapDots = gAll('ir-etapa');
const state = { tab: 'jornada', hideDone: read(HIDE_KEY) === '1' };

// --- Etapas: só a etapa atual de cada parte fica aberta, salvo escolha do usuário ---
const view = readJSON(VIEW_KEY, {});
const saveView = () => store(VIEW_KEY, JSON.stringify(view));
const isDone = st => [...st.querySelectorAll('input[data-id]')].every(b => b.checked);
const currentStage = partId => stages.find(st => st.dataset.parte === partId && !isDone(st));
const collapse = collapsible({
  groups: stages,
  isCollapsed: st => {
    const v = view[stages.indexOf(st)];
    return v ? v === 'closed' : st !== currentStage(st.dataset.parte);
  },
  onToggle: (st, c) => { view[stages.indexOf(st)] = c ? 'closed' : 'open'; saveView(); syncExpandBtn(); },
});

// --- Checklist ---
const list = createChecklist({
  boxes, groups: stages, itemOf: taskOf,
  ...storeAsList(STORAGE_KEY),
  keep: b => stageOf(b).dataset.parte === state.tab && !(state.hideDone && b.checked),
  emptyState: g('vazio'),
  onUpdate: updateProgress,
  afterFilter,
});

// Depois de cada busca/filtro: abre o que a busca encontrou e esconde divisores vazios
function afterFilter(q) {
  if (q) {
    stages.forEach(st => { if (!st.hidden) collapse.show(st, false); });
    boxes.forEach(b => {
      const how = taskOf(b).querySelector('[data-g="como"]');
      if (!how) return;
      const hit = norm(how.textContent).includes(q);
      if (hit && !how.open) { how.open = true; how.dataset.auto = '1'; }
      else if (!hit && how.dataset.auto) { how.open = false; delete how.dataset.auto; }
    });
  } else {
    collapse.refresh();
    document.querySelectorAll('[data-g="como"][data-auto]').forEach(h => { h.open = false; delete h.dataset.auto; });
  }
  gAll('divisor').forEach(div => {
    div.hidden = div.dataset.parte !== state.tab || !stages.some(st => st.dataset.parte === div.dataset.parte && !st.hidden);
  });
  // Busca sem resultado aqui: avisa se há resultados em outra parte
  const sugestoes = [];
  const empty = g('vazio');
  if (q && empty && !empty.hidden) {
    parts.filter(p => p.id !== state.tab).forEach(p => {
      const n = boxes.filter(b => stageOf(b).dataset.parte === p.id && norm(taskOf(b).textContent).includes(q)).length;
      if (n) sugestoes.push({ parte: p.id, titulo: p.title, n });
    });
  }
  fill('vazio-dica', sugestoes.length ? t.outrasPartes(sugestoes) : '');
}
gAll('vazio-dica').forEach(el => el.addEventListener('click', e => { const b = e.target.closest('[data-ir-parte]'); if (b) setTab(b.dataset.irParte); }));

// Progresso: contagens por parte, mapa da jornada, marcos — e o tema desenha o resto
function updateProgress() {
  const { done, total } = list.stats();
  const partes = parts.map(p => {
    const s = list.stats(boxes.filter(b => stageOf(b).dataset.parte === p.id));
    document.querySelectorAll(`[data-g="contagem-aba"][data-parte="${p.id}"]`).forEach(el => { el.textContent = `${s.done}/${s.total}`; });
    return { id: p.id, titulo: p.title, feitas: s.done, total: s.total };
  });
  const current = new Set(parts.map(p => currentStage(p.id)));
  mapDots.forEach(dot => {
    const st = stages[+dot.dataset.etapa], s = list.stats(list.boxesOf(st));
    dot.style.setProperty('--g-progresso', s.total ? s.done / s.total : 0);
    dot.toggleAttribute('data-completo', s.done === s.total);
    dot.toggleAttribute('data-atual', current.has(st));
  });
  unlockEls.forEach(el => el.toggleAttribute('data-aceso', !!(byId[el.dataset.unlock] && byId[el.dataset.unlock].checked)));
  let marcos = null;
  if (ms) {
    const on = document.querySelectorAll('[data-g="marco"][data-aceso]').length;
    gAll('marcos-contagem').forEach(el => { el.textContent = `${on}/${ms.items.length}`; });
    gAll('grupo-marcos').forEach(gr => {
      gr.querySelectorAll('[data-g="grupo-contagem"]').forEach(el => {
        el.textContent = `${gr.querySelectorAll('[data-g="marco"][data-aceso]').length}/${gr.querySelectorAll('[data-g="marco"]').length}`;
      });
    });
    marcos = { acesos: on, total: ms.items.length };
  }
  publishProgress(t, { pagina: 'rota', feitas: done, total, partes, marcos });
}

// Painel de marcos: tocar ou passar o mouse num marco mostra qual é
function showMilestone(chip) {
  const b = ms.items[+chip.dataset.ms];
  gAll('marco').forEach(c => c.removeAttribute('data-selecionado'));
  chip.setAttribute('data-selecionado', '');
  fill('marco-detalhe', t.marcoDetalhe({ nome: b.name, detalhe: b.detail || '' }, chip.hasAttribute('data-aceso')));
}
if (ms) ['click', 'mouseover', 'focusin'].forEach(ev => gAll('marcos').forEach(box => box.addEventListener(ev, e => { const c = e.target.closest('[data-g="marco"]'); if (c) showMilestone(c); })));
gAll('mat-filtros').forEach(box => box.addEventListener('click', e => { const b = e.target.closest('[data-mat]'); if (b) renderMaterials(b.dataset.mat); }));

// Etapa concluída se recolhe sozinha (se o usuário não tiver escolhido deixá-la aberta) e a próxima abre
boxes.forEach(b => b.addEventListener('change', () => { if (!list.query) collapse.refresh(); }));

// --- Abas ---
function setTab(tab, { scrollTo, save = true } = {}) {
  state.tab = tab;
  gAll('aba').forEach(a => a.setAttribute('aria-selected', String(a.dataset.aba === tab)));
  document.documentElement.dataset.gAba = tab;
  hide('painel-rota', tab === 'referencia');
  hide('painel-ref', tab !== 'referencia');
  if (save) store(TAB_KEY, tab);
  if (location.hash.slice(1) !== tab && !scrollTo) history.replaceState(null, '', '#' + tab);
  list.filter();
  syncExpandBtn();
  if (scrollTo) requestAnimationFrame(() => { const el = g(scrollTo); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
// Endereços: #parte, #referencia, #etapa-03, #t12 (uma tarefa; usado pelos links das conquistas)
function fromHash() {
  const h = location.hash.slice(1);
  if (TABS.includes(h)) return setTab(h, { scrollTo: 'abas' });
  const m = h.match(/^etapa-(\d+)$/);
  if (m && stages[+m[1] - 1]) return goToStage(+m[1] - 1);
  if (byId[h]) return goToTask(taskOf(byId[h]));
  return false;
}
window.addEventListener('hashchange', fromHash);

// --- Navegação: mapa, continuar, ir para tarefa ---
function reveal(el) {
  if (el.hidden) { state.hideDone = false; syncHideBtn(); list.clearQuery(); gAll('busca').forEach(i => { i.value = ''; }); list.filter(); }
}
function goToStage(i) {
  const st = stages[i];
  if (state.tab !== st.dataset.parte) setTab(st.dataset.parte);
  reveal(st);
  collapse.show(st, false);
  st.scrollIntoView({ behavior: 'smooth', block: 'start' });
  flash(st);
}
function goToTask(task) {
  const st = task.closest('[data-g="etapa"]');
  if (state.tab !== st.dataset.parte) setTab(st.dataset.parte);
  reveal(task);
  collapse.show(st, false);
  task.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(task);
}
gAll('mapa').forEach(box => box.addEventListener('click', e => { const d = e.target.closest('[data-g="ir-etapa"]'); if (d) goToStage(+d.dataset.etapa); }));
gAll('proxima').forEach(btn => btn.addEventListener('click', () => {
  const next = boxes.find(b => !b.checked);
  if (next) goToTask(taskOf(next));
}));

// --- Ferramentas: ocultar concluídas, busca, expandir, menu ⋯ ---
function syncHideBtn() { gAll('ocultar-feitas').forEach(b => b.setAttribute('aria-pressed', String(state.hideDone))); }
gAll('ocultar-feitas').forEach(b => b.addEventListener('click', () => { state.hideDone = !state.hideDone; store(HIDE_KEY, state.hideDone ? '1' : '0'); syncHideBtn(); list.filter(); }));
gAll('busca').forEach(i => i.addEventListener('input', e => list.setQuery(e.target.value)));

const tabStages = () => stages.filter(st => st.dataset.parte === state.tab);
function syncExpandBtn() { gAll('expandir').forEach(b => { b.textContent = collapse.allOpen(tabStages()) ? 'Recolher tudo' : 'Expandir tudo'; }); }
const setAllInTab = collapsed => { tabStages().forEach(st => { view[stages.indexOf(st)] = collapsed ? 'closed' : 'open'; }); saveView(); collapse.refresh(); syncExpandBtn(); };
gAll('expandir').forEach(b => b.addEventListener('click', () => setAllInTab(collapse.allOpen(tabStages()))));
gAll('so-atual').forEach(b => b.addEventListener('click', () => { tabStages().forEach(st => { delete view[stages.indexOf(st)]; }); saveView(); collapse.refresh(); syncExpandBtn(); }));
gAll('menu-mais').forEach(initMoreMenu);
gAll('imprimir').forEach(b => b.addEventListener('click', () => window.print()));
gAll('exportar').forEach(b => b.addEventListener('click', exportSave));
gAll('importar').forEach(b => b.addEventListener('click', importSave));
// Na impressão, o "Como fazer" de todas as tarefas aparece aberto
let closedHowtos = [];
window.addEventListener('beforeprint', () => { document.documentElement.setAttribute('data-imprimindo', ''); closedHowtos = [...document.querySelectorAll('[data-g="como"]:not([open])')]; closedHowtos.forEach(h => { h.open = true; }); });
window.addEventListener('afterprint', () => { document.documentElement.removeAttribute('data-imprimindo'); closedHowtos.forEach(h => { h.open = false; }); });
gAll('zerar').forEach(b => b.addEventListener('click', () => {
  if (confirm('Deseja limpar todas as marcações do checklist?')) { list.reset(); forget(STORAGE_KEY); collapse.refresh(); }
}));

// --- Início ---
syncHideBtn();
list.update();
collapse.refresh();
if (fromHash() === false) {
  const saved = read(TAB_KEY);
  setTab(TABS.includes(saved) ? saved : 'jornada', { save: false });
}
