// Moldura comum das pranchas de conceito: lê dados reais do guia e desenha o recorte
// (topo + um capítulo + alguns cartões + progresso) em quatro quadros: escuro e claro, largo e 375 px.
// Cada prancha chama montar({ render, ids, capitulo, feitas }) com o seu próprio renderizador.
// Script comum (sem módulo) e dados em dados.js: abre com duplo clique, sem servidor.
if (location.hash === "#celular") document.documentElement.classList.add("so-celular");   // captura: só os recortes, largura de celular

// Todas as pranchas, na ordem: alimenta o índice (index.html) e a barra de navegação de cada prancha.
// Prancha nova: acrescente aqui (n, nome, frase, fontes, rodada) e gere as capturas em capturas/.
window.PRANCHAS = [
  { n: 1, nome: 'O Dossiê da NSA', frase: 'O arquivo do agente Rick Dicker: pastas manilha, fichas datilografadas e o carimbo "caso encerrado".', fontes: 'Staatliches · Courier Prime · Libre Franklin', rodada: 1 },
  { n: 2, nome: 'Créditos de 1962', frase: 'A abertura de um filme de espionagem dos anos 60: faixas diagonais e o emblema "i" que se preenche.', fontes: 'Big Shoulders Display · Jost', rodada: 1 },
  { n: 3, nome: 'O Ateliê da Edna', frase: 'O caderno de croquis da Edna: amostras de tecido, fita métrica e a rubrica que aprova cada conquista.', fontes: 'Bodoni Moda · Karla', rodada: 1 },
  { n: 4, nome: 'O Dossiê da Família', frase: 'A estrutura do 1 com as cores do 2: o dossiê no vermelho e laranja do uniforme, com o lacre "i".', fontes: 'Staatliches · Courier Prime · Libre Franklin', rodada: 1 },
  { n: 5, nome: 'Gazeta de Metroville', frase: 'O jornal da cidade em 1962: manchetes, cadernos, matérias em colunas e a faixa EXTRA! ao marcar.', fontes: 'UnifrakturCook · Abril Fatface · Newsreader', rodada: 2, noAr: true },
  { n: 6, nome: 'Os Incríveis em Quadrinhos', frase: 'Um gibi de banca nº 100: quadros, legendas amarelas, a dica num balão e um POW! ao marcar.', fontes: 'Bangers · Atkinson Hyperlegible', rodada: 2 },
  { n: 7, nome: 'Linhas do Trem Flutuante', frase: 'O mapa dos trens da cidade: cada capítulo uma linha, cada conquista uma estação onde o trem chega.', fontes: 'Overpass · Overpass Mono', rodada: 2 },
];

// Barra comum no topo de cada prancha: índice, anterior/próxima e atalho para cada número.
document.addEventListener('DOMContentLoaded', () => {
  const m = location.pathname.match(/conceito-(\d+)\.html$/);
  const nav = document.querySelector('.pr-nav');
  if (!m || !nav) return;
  const atual = +m[1], lista = window.PRANCHAS, i = lista.findIndex(p => p.n === atual);
  const ant = lista[i - 1], prox = lista[i + 1];
  nav.innerHTML = `<a class="pr-nav-indice" href="index.html">☰ Todas as pranchas</a>
   <span class="pr-nav-nums">${lista.map(p => p.n === atual ? `<b aria-current="page">${p.n}</b>` : `<a href="conceito-${p.n}.html" title="${p.nome}">${p.n}</a>`).join('')}</span>
   ${ant ? `<a href="conceito-${ant.n}.html">← ${ant.n}</a>` : ''}${prox ? `<a href="conceito-${prox.n}.html">${prox.n} →</a>` : ''}`;
});

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
