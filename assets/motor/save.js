// Exportar/importar o progresso (todas as chaves do guia no navegador) e o menu ⋯ das barras de ferramentas.
import { read, store } from './util.js';
import { PREFIX } from '../guia.config.js';

const mine = k => k.startsWith(PREFIX + '-');

// Baixa um .json com tudo que o guia guardou neste navegador (progresso, filtros, tema)
export function exportSave() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (mine(k)) data[k] = read(k); }
  } catch (e) {}
  const blob = new Blob([JSON.stringify({ guia: PREFIX, exportado: new Date().toISOString(), dados: data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${PREFIX}-progresso.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Progresso exportado.');
}

// Abre um .json exportado antes e restaura as chaves deste guia; depois recarrega a página
export function importSave() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const entries = Object.entries(json.dados || {}).filter(([k, v]) => mine(k) && typeof v === 'string');
      if (json.guia !== PREFIX || !entries.length) { toast('Este arquivo não é um progresso deste guia.'); return; }
      entries.forEach(([k, v]) => store(k, v));
      toast('Progresso importado. Recarregando…');
      setTimeout(() => location.reload(), 700);
    } catch (e) { toast('Não foi possível ler o arquivo.'); }
  });
  input.click();
}

let toastTimer;
export function toast(msg) {
  let el = document.querySelector('.g-toast');
  if (!el) { el = document.createElement('div'); el.className = 'g-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// Menu ⋯: fecha ao escolher uma opção, clicar fora ou apertar Esc
export function initMoreMenu(menu) {
  menu.addEventListener('click', e => { if (e.target.closest('button')) menu.open = false; });
  document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.open = false; });
}
