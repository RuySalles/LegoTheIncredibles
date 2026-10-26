// MOTOR da página de conquistas (index.html). Igual em todo guia: não edite por jogo.
// Lê data/conquistas.json, prepara os dados de cada peça e pede o HTML ao tema (assets/tema/tema.js).
// Comportamento (marcar, filtrar, buscar, recolher, navegar) só pelos ganchos data-g da página.
import { $, esc, pad2, loadJSON, loadError, flash, store, read, readJSON, forget } from './util.js';
import { renderCasca, publishProgress } from './casca.js';
import { createChecklist, storeAsMap, collapsible } from './checklist.js';
import { sourceIndex, srcList, renderSources } from './fontes.js';
import { exportSave, importSave, initMoreMenu } from './save.js';
import padrao from './padrao.js';
import tema from '../tema/tema.js';
import { PREFIX, HAS_ROTA } from '../guia.config.js';

const t = { ...padrao, ...tema };
const g = name => document.querySelector(`[data-g="${name}"]`);
const gAll = name => [...document.querySelectorAll(`[data-g="${name}"]`)];
const fill = (name, html) => gAll(name).forEach(el => { el.innerHTML = html; });

// Chaves de armazenamento — NÃO alterar depois de publicar, para manter o progresso já salvo.
const KEY = PREFIX + '-achievements-v1';
const FILTER_KEY = PREFIX + '-achievements-filter-v1';
const VIEW_KEY = PREFIX + '-achievements-view-v1';   // capítulos abertos/fechados na mão: { "capitulo-id": "open" | "closed" }
const SPOILER_KEY = PREFIX + '-spoilers-v1';

// Faixas de raridade pela % global da Steam
const RARITY = [[8, 'epic', 'Épica', '<8%'], [15, 'rare', 'Rara', '8–15%'], [30, 'uncommon', 'Incomum', '15–30%'], [Infinity, 'common', 'Comum', '30%+']];
const rarity = p => RARITY.find(([max]) => p < max);
const pct = p => p.toFixed(1).replace('.', ',') + '%';
const roman = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'][n - 1] || String(n);
const DIFF = ['', 'Muito fácil', 'Fácil', 'Média', 'Difícil', 'Muito difícil'];
const strip = html => html.replace(/<[^>]+>/g, '');

let data, fontes, rota = null;
try {
  [data, fontes] = await Promise.all([loadJSON('data/conquistas.json'), loadJSON('data/fontes.json')]);
  if (HAS_ROTA) rota = await loadJSON('data/rota.json').catch(() => null);
} catch (err) { renderCasca(t, 'conquistas'); loadError(g('vazio') || document.body, err); throw err; }

// Partes da rota (para o menu) e onde mora cada tarefa (para os links "Na rota")
const parts = [{ id: 'jornada', title: (rota && rota.mainTitle) || 'Jornada' }];
const taskInfo = {};
(rota ? rota.stages : []).forEach((st, i) => {
  if (st.part) parts.push({ id: st.part.id, title: st.part.title });
  st.tasks.forEach(tk => { taskInfo[tk.id] = { stage: i + 1, title: tk.title }; });
});
renderCasca(t, 'conquistas', rota ? parts : []);
const srcIdx = sourceIndex(fontes);
const ach = data.achievements;

// =====================================================================
// DADOS DE CADA PEÇA (o que o tema recebe)
// =====================================================================
function achView(id) {
  const a = ach[id];
  const [, chave, rotulo] = rarity(a.pct);
  const fs = srcList(a.sources, srcIdx);
  return {
    id, nome: a.name, desc: a.desc || '', dica: a.tip,
    icone: `assets/achievements/${id.toLowerCase()}.jpg`,
    raridade: { chave, rotulo, pct: pct(a.pct), valor: a.pct },
    dificuldade: a.difficulty ? { n: a.difficulty, rotulo: DIFF[a.difficulty] } : null,
    tempo: a.time || '',
    junto: (a.together || []).map(j => ({ id: j, nome: ach[j] ? ach[j].name : j, href: `#ach-${esc(j)}` })),
    naRota: (a.rota || []).map(r => ({ href: `rota.html#${esc(r)}`, texto: taskInfo[r] ? `etapa ${pad2(taskInfo[r].stage)} · ${strip(taskInfo[r].title)}` : r })),
    perdivel: a.missable ? (a.missable === true ? 'pode ser perdida; veja a dica.' : a.missable) : '',
    spoiler: !!(a.spoiler || a.hidden), solo: !!a.solo, online: !!a.online,
    fontes: fs, linhaFontes: t.linhaFontes(fs),
  };
}

function render() {
  const ids = Object.keys(ach);
  fill('capitulos', data.chapters.map((c, i) => {
    const itens = c.achievements.map(achView);
    return t.capitulo({ id: c.id, n: i + 1, romano: roman(i + 1), titulo: c.title, subtitulo: c.subtitle || '', nota: c.note || '',
      total: itens.length, conquistas: itens, cartoes: itens.map(t.conquista).join('\n') });
  }).join('\n'));
  gAll('total').forEach(el => { el.textContent = ids.length; });
  if (!rota) gAll('link-rota').forEach(el => { el.hidden = true; });

  // {pct100}: % da conquista de 100% (completion), ou da mais rara como aproximação
  const done100 = ach[data.completion] || ids.map(id => ach[id]).sort((a, b) => a.pct - b.pct)[0];
  fill('intro', (data.intro || '').replace('{pct100}', done100 ? pct(done100.pct) : '?'));
  const [y, m, d] = data.updated.split('-');
  gAll('nota-raridade').forEach(el => { el.textContent = `Raridade = % global de jogadores da Steam que desbloquearam, coletada em ${d}/${m}/${y}.`; });

  const ov = data.overview;
  if (ov) fill('resumo', t.resumo({ dificuldade: ov.difficulty, horas: ov.hours, jogadas: ov.playthroughs, perdiveis: ids.filter(id => ach[id].missable).length,
    online: ov.online, nivel: ov.gameDifficulty, resumo: ov.summary || '' }));
  else gAll('sec-resumo').forEach(el => { el.hidden = true; });
  if (data.roadmap && data.roadmap.length) fill('roteiro', t.roteiro(data.roadmap.map(s => ({ titulo: s.title, texto: s.text,
    capitulo: s.chapter ? `#${esc(s.chapter)}` : '', rota: s.rota ? `rota.html#${esc(s.rota)}` : '' }))));
  else gAll('sec-roteiro').forEach(el => { el.hidden = true; });

  const usage = {};
  ids.forEach(id => (ach[id].sources || []).forEach(s => { usage[s] = (usage[s] || 0) + 1; }));
  renderSources(t, fontes, usage);
}
render();

// =====================================================================
// COMPORTAMENTO
// =====================================================================
const cardOf = b => b.closest('[data-g="conquista"]');
const boxes = [...document.querySelectorAll('[data-g="conquista"] input[data-id]')];
const chapters = gAll('capitulo');
if (boxes.length !== Object.keys(ach).length) console.warn(`[motor] ${Object.keys(ach).length} conquistas nos dados, mas ${boxes.length} checkboxes na página: confira os ganchos de tema.conquista.`);
const state = { filter: 'all', missable: false };

const list = createChecklist({
  boxes, groups: chapters, itemOf: cardOf,
  ...storeAsMap(KEY),
  keep: b => (state.filter === 'all' || (state.filter === 'done') === b.checked) && (!state.missable || cardOf(b).hasAttribute('data-perdivel')),
  emptyState: g('vazio'),
  afterFilter: q => { if (q || state.missable) chapters.forEach(c => { if (!c.hidden) collapse.show(c, false); }); else collapse.refresh(); },
  onUpdate: () => {
    const { done, total } = list.stats();
    const raridade = RARITY.map(([, chave, rotulo, faixa]) => {
      const s = list.stats(boxes.filter(b => cardOf(b).dataset.raridade === chave));
      return { chave, rotulo, faixa, feitas: s.done, total: s.total };
    });
    const capitulos = chapters.map(c => { const s = list.stats(list.boxesOf(c)); return { id: c.id, feitas: s.done, total: s.total }; });
    publishProgress(t, { pagina: 'conquistas', feitas: done, total, raridade, capitulos });
  },
});
// Atributos que o motor põe em cada cartão, para filtros e para o CSS do tema
boxes.forEach(b => {
  const card = cardOf(b), a = ach[b.dataset.id];
  card.dataset.raridade = rarity(a.pct)[1];
  if (a.missable) card.setAttribute('data-perdivel', '');
  if (a.spoiler || a.hidden) card.setAttribute('data-tem-spoiler', '');
});

// Capítulos: os concluídos se fecham sozinhos, salvo escolha do usuário
const view = readJSON(VIEW_KEY, {});
const collapse = collapsible({
  groups: chapters,
  isCollapsed: c => view[c.id] ? view[c.id] === 'closed' : c.hasAttribute('data-completo'),
  onToggle: (c, closed) => { view[c.id] = closed ? 'closed' : 'open'; store(VIEW_KEY, JSON.stringify(view)); },
});
boxes.forEach(b => b.addEventListener('change', () => { if (!list.query) collapse.refresh(); }));

// Ir até uma conquista (Próxima pendente, links "Faça junto com", endereço #ach-ID)
function goTo(card) {
  if (card.hidden) { gAll('busca').forEach(i => { i.value = ''; }); list.clearQuery(); state.missable = false; syncMissable(); setFilter('all', true); }
  collapse.show(card.closest('[data-g="capitulo"]'), false);
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(card);
}
gAll('proxima').forEach(btn => btn.addEventListener('click', () => {
  const next = boxes.find(b => !b.checked);
  if (next) goTo(cardOf(next));
}));
function fromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  const el = h && document.getElementById(h);
  if (!el) return;
  if (el.matches('[data-g="conquista"]')) goTo(el);
  else if (el.matches('[data-g="capitulo"]')) { collapse.show(el, false); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}
window.addEventListener('hashchange', fromHash);

// --- Filtros, busca, perdíveis, spoilers ---
function setFilter(f, persist) {
  state.filter = f;
  gAll('filtro').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filtro === f)));
  if (persist) store(FILTER_KEY, f);
  list.filter();
}
gAll('filtro').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filtro, true)));
gAll('busca').forEach(i => i.addEventListener('input', e => list.setQuery(e.target.value)));
const syncMissable = () => gAll('perdiveis').forEach(b => b.setAttribute('aria-pressed', String(state.missable)));
gAll('perdiveis').forEach(b => b.addEventListener('click', () => { state.missable = !state.missable; syncMissable(); list.filter(); }));
if (!document.querySelector('[data-perdivel]')) gAll('perdiveis').forEach(b => { b.hidden = true; });

const setSpoilers = on => {
  document.documentElement.toggleAttribute('data-spoilers', on);
  gAll('spoilers').forEach(b => b.setAttribute('aria-pressed', String(on)));
  store(SPOILER_KEY, on ? '1' : '0');
};
gAll('spoilers').forEach(b => b.addEventListener('click', () => setSpoilers(!document.documentElement.hasAttribute('data-spoilers'))));
if (!document.querySelector('[data-tem-spoiler]')) gAll('spoilers').forEach(b => { b.hidden = true; });

// --- Menu ⋯ e ferramentas ---
gAll('menu-mais').forEach(initMoreMenu);
gAll('imprimir').forEach(b => b.addEventListener('click', () => window.print()));
gAll('exportar').forEach(b => b.addEventListener('click', exportSave));
gAll('importar').forEach(b => b.addEventListener('click', importSave));
gAll('zerar').forEach(b => b.addEventListener('click', () => {
  if (confirm('Deseja limpar todas as conquistas marcadas?')) { list.reset(); forget(KEY); collapse.refresh(); }
}));
// Na impressão, capítulos recolhidos aparecem abertos (motor.css) e spoilers ficam visíveis
window.addEventListener('beforeprint', () => document.documentElement.setAttribute('data-imprimindo', ''));
window.addEventListener('afterprint', () => document.documentElement.removeAttribute('data-imprimindo'));

// --- Início ---
const savedFilter = read(FILTER_KEY);
setSpoilers(read(SPOILER_KEY) === '1');
setFilter(savedFilter === 'pending' || savedFilter === 'done' ? savedFilter : 'all', false);
list.update();
collapse.refresh();
fromHash();
