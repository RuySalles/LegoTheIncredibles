// Moldura comum das pranchas de conceito: lê dados reais do guia e desenha o recorte
if (location.hash === "#celular") document.documentElement.classList.add("so-celular");   // captura: só os recortes, largura de celular
// (topo + um capítulo + alguns cartões + progresso) em quatro quadros: escuro e claro, largo e 375 px.
// Cada prancha chama montar({ render, ids, capitulo, feitas }) com o seu próprio renderizador.
// Script comum (sem módulo) e dados em dados.js: abre com duplo clique, sem servidor.

const RARITY = [[8, 'epic', 'Épica'], [15, 'rare', 'Rara'], [30, 'uncommon', 'Incomum'], [Infinity, 'common', 'Comum']];
const pct = p => p.toFixed(1).replace('.', ',') + '%';

window.montar = async function montar({ render, ids, capitulo, feitas = [] }) {
  const data = window.PRANCHA_DADOS;
  const ach = data.achievements;
  const total = Object.keys(ach).length;
  const ch = data.chapters.find(c => c.id === capitulo);
  const cards = ids.map(id => {
    const a = ach[id];
    const [, chave, rotulo] = RARITY.find(([max]) => a.pct < max);
    return { id, nome: a.name, desc: a.desc, dica: a.tip, icone: `../../assets/achievements/${id.toLowerCase()}.jpg`,
      raridade: { chave, rotulo, pct: pct(a.pct) }, dificuldade: a.difficulty || 0, tempo: a.time || '', feita: feitas.includes(id) };
  });
  const vm = {
    total, capitulo: { titulo: ch.title, subtitulo: ch.subtitle, total: ch.achievements.length, n: data.chapters.indexOf(ch) + 1 },
    cards, overview: data.overview, nCapitulos: data.chapters.length,
  };
  document.querySelectorAll('[data-quadro]').forEach(q => {
    q.innerHTML = render(vm);
    // Demonstração do momento de assinatura: clicar no checkbox marca/desmarca o cartão
    const update = () => {
      const done = q.querySelectorAll('[data-card][data-feita]').length;
      const p = (Math.round(total * 0.31) + done) / total;   // progresso de exemplo: 31% do guia + o que for marcado aqui
      q.style.setProperty('--g-progresso', p.toFixed(3));
      q.querySelectorAll('[data-pct]').forEach(el => { el.textContent = Math.round(p * 100) + '%'; });
      q.querySelectorAll('[data-feitas]').forEach(el => { el.textContent = `${Math.round(total * 0.31) + done}/${total}`; });
      q.dispatchEvent(new CustomEvent('progresso', { detail: p }));
    };
    q.querySelectorAll('[data-card] input').forEach(inp => {
      const card = inp.closest('[data-card]');
      inp.checked = card.hasAttribute('data-feita');
      inp.addEventListener('change', () => { card.toggleAttribute('data-feita', inp.checked); update(); });
    });
    update();
  });
}
