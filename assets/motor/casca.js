// Casca comum das páginas: topo, menu, rodapé, tema claro/escuro e o progresso global.
// O desenho do topo e do rodapé é do tema (tema.casca); aqui só entram os dados e o comportamento.
import { store, read } from './util.js';
import { PREFIX, GAME, BRAND, HAS_ROTA, FOOTER } from '../guia.config.js';

const FILES = { conquistas: 'index.html', rota: 'rota.html' };

// Links do menu: Conquistas primeiro (foco do guia), depois cada parte da rota e a Referência.
function navItems(current, parts) {
  const items = [{ rotulo: 'Conquistas', pagina: 'conquistas' }];
  if (HAS_ROTA) {
    parts.forEach(p => items.push({ rotulo: p.title, pagina: 'rota', hash: p.id }));
    items.push({ rotulo: 'Referência', pagina: 'rota', hash: 'referencia' });
  }
  return items.map(it => ({
    ...it,
    href: it.hash ? `${it.pagina === current ? '' : FILES[it.pagina]}#${it.hash}` : FILES[it.pagina],
    atual: it.pagina === current && !it.hash,
  }));
}

/** Monta topo e rodapé com o tema e liga os comportamentos (tema claro/escuro, menu do celular). */
export function renderCasca(t, current, parts = []) {
  const { topo, rodape } = t.casca({ pagina: current, links: navItems(current, parts), jogo: GAME, marca: BRAND, rodape: FOOTER, temRota: HAS_ROTA });
  document.querySelectorAll('[data-g="topo"]').forEach(el => { el.innerHTML = topo || ''; });
  document.querySelectorAll('[data-g="rodape"]').forEach(el => { el.innerHTML = rodape || ''; });
  initTheme(t);
  initMenu();
}

// --- Tema claro/escuro (o inicial é aplicado por theme-init.js, antes da pintura) ---
const THEME_KEY = PREFIX + '-theme';
function initTheme(t) {
  const meta = document.querySelector('meta[name="theme-color"]');
  const btns = [...document.querySelectorAll('[data-g="alternar-tema"]')];
  const cores = t.cores || {};
  const apply = th => {
    document.documentElement.setAttribute('data-theme', th);
    if (meta && cores[th]) meta.setAttribute('content', cores[th]);
    btns.forEach(b => {
      b.setAttribute('aria-label', th === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
      b.setAttribute('aria-pressed', String(th === 'light'));
    });
  };
  apply(document.documentElement.getAttribute('data-theme') || 'dark');
  btns.forEach(b => b.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next); store(THEME_KEY, next);
  }));
  // Sem preferência salva: acompanha o sistema
  if (!read(THEME_KEY) && window.matchMedia) {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (!read(THEME_KEY)) apply(e.matches ? 'light' : 'dark');
    });
  }
}

// --- Menu do celular: [data-g="abrir-menu"] abre/fecha [data-g="nav"] (atributo data-aberto) ---
function initMenu() {
  const btn = document.querySelector('[data-g="abrir-menu"]'), nav = document.querySelector('[data-g="nav"]');
  if (!btn || !nav) return;
  const set = open => {
    nav.toggleAttribute('data-aberto', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  set(false);
  btn.addEventListener('click', () => set(!nav.hasAttribute('data-aberto')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
}

/**
 * Publica o progresso para o tema: variável CSS --g-progresso (0–1) e data-g-pct no <html>,
 * e chama tema.progresso(info) para quem quiser desenhar algo próprio.
 */
export function publishProgress(t, info) {
  const pct = info.total ? info.feitas / info.total : 0;
  const root = document.documentElement;
  root.style.setProperty('--g-progresso', pct);
  root.dataset.gPct = Math.round(pct * 100);
  t.progresso({ ...info, pct: Math.round(pct * 100) });
}
