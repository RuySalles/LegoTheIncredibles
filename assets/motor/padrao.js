// Renderizadores NEUTROS do motor: o esqueleto que funciona antes de existir um tema.
// Não são um modelo de visual. Cada guia sobrescreve em assets/tema/tema.js o que quiser
// (no mínimo casca, conquista, capitulo e progresso; na rota, tarefa, etapa e progresso).
//
// Contrato: o HTML devolvido pode ter qualquer forma, desde que mantenha os ganchos data-g
// indicados em cada função (é por eles que o motor marca, filtra, recolhe e navega).
import { esc } from './util.js';

const list = arr => arr.join('\n');
const links = fs => fs.map(f => f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.rotulo)}</a>` : `<span>${esc(f.rotulo)}</span>`).join(' · ');

export default {
  // Cores da barra do navegador no celular, por tema ({ dark, light }).
  cores: { dark: '#202020', light: '#f4f4f4' },

  // ---------------------------------------------------------------- casca (todas as páginas)
  // Ganchos: [data-g="nav"] (menu), [data-g="abrir-menu"] (botão do celular), [data-g="alternar-tema"].
  casca: ({ links: items, marca, rodape }) => ({
    topo: `<a href="index.html">${esc(marca)}</a>
<button type="button" data-g="abrir-menu" aria-expanded="false">Menu</button>
<nav data-g="nav" aria-label="Navegação principal">${items.map(l => `<a href="${l.href}"${l.atual ? ' aria-current="page"' : ''}>${esc(l.rotulo)}</a>`).join(' ')}</nav>
<button type="button" data-g="alternar-tema">Tema</button>`,
    rodape: `<p>${rodape}</p>`,
  }),

  // Linha "Fontes: …" no fim de cada dica/tarefa. fs = [{ rotulo, url }]
  linhaFontes: fs => fs.length ? `<small>Fontes: ${links(fs)}</small>` : '',
  // Lista completa no fim da página. lista = [{ titulo, url, sobre, usos }]
  fontes: lista => `<ul>${list(lista.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.titulo)}</a>` : esc(s.titulo)}${s.sobre ? `: ${s.sobre}` : ''}${s.usos ? ` (${s.usos})` : ''}</li>`))}</ul>`,
  // Pontos a confirmar. pontos = [{ texto, fontes }]
  confirmar: pontos => `<ul>${list(pontos.map(p => `<li>${p.texto} ${p.fontes.length ? `<small>${links(p.fontes)}</small>` : ''}</li>`))}</ul>`,

  // ---------------------------------------------------------------- conquistas
  /**
   * Uma conquista. c = { id, nome, desc, dica, icone, raridade: { chave, rotulo, pct }, dificuldade: { n, rotulo } | null,
   *   tempo, junto: [{ id, nome, href }], naRota: [{ href, texto }], perdivel, spoiler, solo, online, fontes, linhaFontes }
   * Ganchos obrigatórios: raiz com data-g="conquista" e id="ach-<id>"; um <input type="checkbox" data-id="<id>">.
   * Partes que borram até o visitante pedir spoilers: data-g-spoiler.
   */
  conquista: c => `<article data-g="conquista" id="ach-${esc(c.id)}">
<label><input type="checkbox" data-id="${esc(c.id)}"> <img src="${c.icone}" alt="" width="48" height="48" loading="lazy" decoding="async"> <strong>${c.nome}</strong></label>
<p${c.spoiler ? ' data-g-spoiler' : ''}>${c.desc ? `“${c.desc}”` : 'Conquista oculta'}</p>
${c.perdivel ? `<p><b>Perdível:</b> ${c.perdivel}</p>` : ''}
<p${c.spoiler ? ' data-g-spoiler' : ''}>${c.dica}</p>
${c.junto.length ? `<p><b>Faça junto com:</b> ${c.junto.map(j => `<a href="${j.href}">${j.nome}</a>`).join(', ')}</p>` : ''}
${c.naRota.length ? `<p><b>Na rota:</b> ${c.naRota.map(r => `<a href="${r.href}">${esc(r.texto)}</a>`).join(', ')}</p>` : ''}
<p><small>${c.raridade.rotulo} · ${c.raridade.pct}${c.dificuldade ? ` · dificuldade ${c.dificuldade.n}/5` : ''}${c.tempo ? ` · ${c.tempo}` : ''}${c.solo ? ' · só 1 jogador' : ''}${c.online ? ' · online' : ''}</small></p>
${c.linhaFontes}
</article>`,

  /**
   * Um capítulo. c = { id, n, romano, titulo, subtitulo, nota, total, conquistas: [...], cartoes: HTML já montado }
   * Ganchos: raiz data-g="capitulo" id="<id>"; [data-g="cabeca"] (clique recolhe); [data-g="corpo"] (some quando recolhido);
   * [data-g="contagem"] (o motor escreve "feitas/total").
   */
  capitulo: c => `<section data-g="capitulo" id="${esc(c.id)}">
<h2 data-g="cabeca">${c.romano}. ${c.titulo} <span data-g="contagem">0/${c.total}</span></h2>
<div data-g="corpo"><p>${c.subtitulo}</p>${c.nota ? `<p>${c.nota}</p>` : ''}
${c.cartoes}
</div>
</section>`,

  // Resumo do 100%. r = { dificuldade, horas, jogadas, perdiveis, online, nivel, resumo } (campos podem faltar)
  resumo: r => `<dl>${[['Dificuldade', r.dificuldade && `${r.dificuldade}/10`], ['Tempo para 100%', r.horas], ['Jogadas', r.jogadas], ['Perdíveis', r.perdiveis],
    ['Online', r.online], ['Nível de dificuldade', r.nivel]].filter(([, v]) => v !== undefined && v !== '' && v !== null).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${r.resumo ? `<p>${r.resumo}</p>` : ''}`,

  // Roteiro. passos = [{ titulo, texto, capitulo: href|'' , rota: href|'' }]
  roteiro: passos => `<ol>${list(passos.map(p => `<li><strong>${p.titulo}</strong> ${p.texto}${p.capitulo ? ` <a href="${p.capitulo}">Ver capítulo</a>` : ''}${p.rota ? ` <a href="${p.rota}">Ver na rota</a>` : ''}</li>`))}</ol>`,

  /**
   * Chamado a cada marcação. p = { pagina, feitas, total, pct, raridade?: [{ chave, rotulo, faixa, feitas, total }], partes?: [...] }
   * O motor já publica --g-progresso (0–1) e data-g-pct no <html>; aqui o tema desenha o resto.
   */
  progresso: p => {
    document.querySelectorAll('[data-g="progresso"]').forEach(el => { el.textContent = `${p.feitas}/${p.total} · ${p.pct}%`; });
  },

  // ---------------------------------------------------------------- rota
  /**
   * Uma tarefa. t = { id, titulo, desc, etiquetas: [{ texto, papel }], conquistas: [{ id, nome, href }], materiais: [{ nome, n }], fontes, linhaFontes }
   * Ganchos: raiz data-g="tarefa" id="<id>"; <input type="checkbox" data-id="<id>">; o "como fazer" num <details data-g="como">.
   */
  tarefa: t => `<div data-g="tarefa" id="${esc(t.id)}">
<label><input type="checkbox" data-id="${esc(t.id)}"> ${t.titulo}</label>
<small>${t.etiquetas.map(e => e.texto).join(' · ')}${t.conquistas.map(c => ` · <a href="${c.href}">🏆 ${c.nome}</a>`).join('')}</small>
<details data-g="como"><summary>Como fazer</summary>${t.desc}${t.materiais.length ? `<p><b>Materiais:</b> ${t.materiais.map(m => `${m.n} ${m.nome}`).join(' · ')}</p>` : ''}${t.linhaFontes}</details>
</div>`,
  /**
   * Uma etapa. e = { id: "etapa-NN", n, num, titulo, subtitulo, tag, nota, parte, total, tarefas: [...], cartoes: HTML }
   * Ganchos: raiz data-g="etapa" id e data-parte; [data-g="cabeca"]; [data-g="corpo"]; [data-g="contagem"].
   */
  etapa: e => `<article data-g="etapa" id="${e.id}" data-parte="${esc(e.parte)}">
<h3 data-g="cabeca">${e.num} · ${e.titulo} <small>${e.tag}</small> <span data-g="contagem">0/${e.total}</span></h3>
<div data-g="corpo"><p>${e.subtitulo}</p>${e.nota ? `<p>${e.nota}</p>` : ''}
${e.cartoes}
</div>
</article>`,
  // Divisor antes da primeira etapa de uma nova parte. p = { id, titulo, texto }. Gancho: data-g="divisor" data-parte.
  divisor: p => `<div data-g="divisor" data-parte="${esc(p.id)}"><h2>${p.titulo}</h2><p>${p.texto}</p></div>`,
  // Abas das partes. a = { id, titulo, contar }. Ganchos: data-g="aba" data-aba (aria-selected); [data-g="contagem-aba"][data-parte].
  aba: a => `<a role="tab" href="#${a.id}" data-g="aba" data-aba="${a.id}">${a.titulo}${a.contar ? ` <span data-g="contagem-aba" data-parte="${a.id}"></span>` : ''}</a>`,
  // Mapa da jornada. partes = [{ id, titulo, etapas: [{ i, num, titulo }] }]. Gancho: botões data-g="ir-etapa" data-etapa="<i>"
  // (o motor põe --g-progresso, data-completo e data-atual em cada um).
  mapa: partes => list(partes.map(p => `<p>${p.titulo}: ${p.etapas.map(e => `<button type="button" data-g="ir-etapa" data-etapa="${e.i}" aria-label="Ir para a etapa ${e.num}: ${esc(e.titulo)}">${e.i + 1}</button>`).join(' ')}</p>`)),
  // Marcos (painel). grupos = [{ id, titulo, marcos: [{ i, rotulo, nome, unlock }] }]
  // Ganchos: data-g="marco" data-ms="<i>" data-unlock (o motor põe data-aceso); [data-g="grupo-marcos"] com [data-g="grupo-contagem"].
  marcos: grupos => list(grupos.map(g => `<div data-g="grupo-marcos"><p>${g.titulo} <span data-g="grupo-contagem"></span></p>${g.marcos.map(m => `<button type="button" data-g="marco" data-ms="${m.i}" data-unlock="${esc(m.unlock)}" aria-label="${esc(m.nome)}">${m.rotulo}</button>`).join(' ')}</div>`)),
  // Texto ao tocar num marco. m = { nome, detalhe }, aceso = boolean
  marcoDetalhe: (m, aceso) => `<strong>${m.nome}</strong>${m.detalhe ? ' · ' + m.detalhe : ''}${aceso ? ' ✓' : ''}`,
  // Tabela de marcos na Referência. partes = [{ id, titulo, marcos: [{ nome, detalhe, unlock, etapaNum }] }]. Linhas com data-unlock.
  marcosTabela: partes => list(partes.map(p => `<h3>${p.titulo}</h3><table><tbody>${p.marcos.map(m => `<tr data-unlock="${esc(m.unlock)}"><td>${m.nome}</td><td>${m.detalhe || ''}</td><td><a href="#${esc(m.unlock)}">etapa ${m.etapaNum}</a></td></tr>`).join('')}</tbody></table>`)),
  // "Como ler a rota". x = { fluxo: [{ rotulo, papel, texto }], legenda: [...], nota }
  comoLer: x => `${x.fluxo.length ? `<ol>${x.fluxo.map(f => `<li><b>${f.rotulo}</b> ${f.texto}</li>`).join('')}</ol>` : ''}${x.legenda.map(l => `<p><b>${l.rotulo}</b> ${l.texto}</p>`).join('')}${x.nota ? `<p>${x.nota}</p>` : ''}`,
  // Totais de materiais. itens = [{ chave, nome, n, destaque }]
  materiais: itens => list(itens.map(m => `<p>${m.destaque ? '<b>' : ''}${m.n} ${m.nome}${m.destaque ? '</b>' : ''}</p>`)),
  // Botões do filtro de materiais. opcoes = [{ id, titulo }]. Gancho: data-mat="<id>" (aria-pressed).
  matFiltros: opcoes => opcoes.map(o => `<button type="button" data-mat="${o.id}" aria-pressed="false">${o.titulo}</button>`).join(' '),
  // Números do topo da rota. n = { etapas, tarefas, conquistas }
  metaRota: n => `${n.etapas} etapas · ${n.tarefas} tarefas${n.conquistas ? ` · ${n.conquistas} conquistas no caminho` : ''}`,
  // Aviso de resultados em outra parte. sugestoes = [{ parte, titulo, n }]. Gancho: data-ir-parte.
  outrasPartes: sugestoes => sugestoes.map(s => `<button type="button" data-ir-parte="${s.parte}">Ver ${s.n} em ${s.titulo}</button>`).join(' '),
};
