// TEMA deste guia: "Gazeta de Metroville" (docs/direcao-de-arte.md, prancha docs/pranchas/conceito-5.html).
// O guia é o jornal da cidade em 1962 cobrindo a volta dos Supers: a página de conquistas é a primeira página,
// cada capítulo um caderno, cada conquista uma matéria; marcar publica a edição EXTRA. A rota é a pauta da redação.
//
// Cada função recebe os DADOS de uma peça e devolve o HTML dela (contrato em assets/motor/padrao.js).
import { esc } from '../motor/util.js';

const CHAPEU = { epic: 'Exclusivo', rare: 'Furo', uncommon: 'Reportagem', common: 'Cidade' };
const DIFICULDADE = ['', 'Fácil', 'Tranquila', 'Média', 'Difícil', 'Muito difícil'];
const ROTULO_NAV = { Conquistas: 'Primeira página', 'Referência': 'Arquivo' };
const link = f => f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.rotulo)}</a>` : `<span>${esc(f.rotulo)}</span>`;
const texto = html => html.replace(/<[^>]+>/g, '');

// A tiragem: uma coluna de tipo por item, agrupadas por caderno/pauta; cada coluna leva ao item.
function tiragem(pagina) {
  const item = pagina === 'rota' ? '[data-g="tarefa"]' : '[data-g="conquista"]';
  const grupo = pagina === 'rota' ? '[data-g="etapa"]' : '[data-g="capitulo"]';
  const nome = el => (el.querySelector('.gz-titulo, .gz-item-tit') || el).textContent.trim();
  document.querySelectorAll('[data-t="tiragem"]').forEach(box => {
    if (!box.dataset.pronto) {
      box.innerHTML = [...document.querySelectorAll(grupo)].map(g => `<span class="gz-tiragem-grupo">${[...g.querySelectorAll(item)]
        .map(it => `<a href="#${it.id}" data-ref="${it.id}" title="${esc(nome(it))}" aria-label="${esc(nome(it))}"></a>`).join('')}</span>`).join('');
      box.dataset.pronto = '1';
    }
    box.querySelectorAll('a[data-ref]').forEach(a => {
      const it = document.getElementById(a.dataset.ref);
      a.toggleAttribute('data-on', !!it && it.hasAttribute('data-feita'));
    });
  });
}

export default {
  // Barra do navegador no celular = fundo de cada tema
  cores: { dark: '#121416', light: '#ddd5c4' },

  // ---------------------------------------------------------------- casca
  casca: ({ links, rodape }) => ({
    topo: `<div class="gz-barra">
 <a class="gz-marca" href="index.html"><span class="gz-gotica">Gazeta</span> <span class="gz-marca-sub">de Metroville</span></a>
 <button type="button" class="gz-btn gz-btn-menu" data-g="abrir-menu" aria-expanded="false">Seções</button>
 <nav class="gz-nav" data-g="nav" aria-label="Seções do jornal">${links.map(l => `<a href="${l.href}"${l.atual ? ' aria-current="page"' : ''}>${esc(ROTULO_NAV[l.rotulo] || l.rotulo)}</a>`).join('')}</nav>
 <button type="button" class="gz-btn gz-btn-tema" data-g="alternar-tema"><span class="gz-edicao-dia"><span class="gz-so-largo">Edição da </span>manhã</span><span class="gz-edicao-noite"><span class="gz-so-largo">Edição da </span>madrugada</span></button>
</div>`,
    rodape: `<div class="gz-rodape"><p class="gz-rodape-fim">— Gazeta de Metroville · fundada em 1962 · rodou em papel-jornal reciclado —</p><p>${rodape}</p></div>`,
  }),

  // ---------------------------------------------------------------- fontes
  linhaFontes: fs => fs.length ? `<p class="gz-agencias">Agências: ${fs.map(link).join(' · ')}</p>` : '',
  fontes: lista => `<ol class="gz-lista-agencias">${lista.map(s => `<li>
   <strong>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.titulo)}</a>` : esc(s.titulo)}</strong>
   ${s.sobre ? ` — ${s.sobre}` : ''}${s.usos ? ` <small>(${s.usos} ${s.usos === 1 ? 'citação' : 'citações'})</small>` : ''}</li>`).join('')}</ol>`,
  confirmar: pontos => `<ul class="gz-lista-apurar">${pontos.map(p => `<li>${p.texto}${p.fontes.length ? ` <small>${p.fontes.map(link).join(' · ')}</small>` : ''}</li>`).join('')}</ul>`,

  // ---------------------------------------------------------------- conquistas
  conquista: c => {
    const sp = c.spoiler ? ' data-g-spoiler' : '';
    const meta = [
      c.dificuldade ? `Dificuldade: ${DIFICULDADE[c.dificuldade.n] || c.dificuldade.n}` : '',
      c.tempo ? `Tempo extra: ${esc(c.tempo)}` : '',
      c.solo ? 'Só 1 jogador' : '', c.online ? 'Online' : '',
    ].filter(Boolean).map(t => `<span>${t}</span>`).join('');
    return `<article class="gz-materia" data-g="conquista" id="ach-${esc(c.id)}">
 <div class="gz-extra" aria-hidden="true">★ Extra! Caso resolvido ★</div>
 <p class="gz-chapeu">${CHAPEU[c.raridade.chave] || 'Cidade'} · ${c.raridade.pct} dos jogadores</p>
 <h3 class="gz-titulo">${c.nome}</h3>
 <figure class="gz-foto"><img src="${c.icone}" alt="" width="64" height="64" loading="lazy" decoding="async"><figcaption>Foto: Steam</figcaption></figure>
 <p class="gz-linha-fina"${sp}>${c.desc || 'Conquista oculta'}</p>
 ${c.perdivel ? `<p class="gz-prazo"><b>Prazo de fechamento:</b> ${c.perdivel}</p>` : ''}
 <p class="gz-corpo"${sp}>${c.dica}</p>
 ${c.junto.length ? `<p class="gz-ref"><b>Leia também:</b> ${c.junto.map(j => `<a href="${j.href}">${j.nome}</a>`).join(' · ')}</p>` : ''}
 ${c.naRota.length ? `<p class="gz-ref"><b>Na pauta:</b> ${c.naRota.map(r => `<a href="${r.href}">${esc(r.texto)}</a>`).join(' · ')}</p>` : ''}
 <footer class="gz-pe">${meta}
  <label class="gz-publicar"><input type="checkbox" data-id="${esc(c.id)}" aria-label="Publicar: ${esc(texto(c.nome))}"><span class="gz-pub-a">Publicar</span><span class="gz-pub-b">Publicada</span></label></footer>
 ${c.linhaFontes}
</article>`;
  },

  capitulo: c => `<section class="gz-caderno" data-g="capitulo" id="${esc(c.id)}">
 <header class="gz-caderno-cab" data-g="cabeca">
  <span class="gz-caderno-n">Caderno ${c.romano}</span>
  <h2>${c.titulo}</h2>
  <p>${c.subtitulo}</p>
  <span class="gz-caderno-cont"><b data-g="contagem">0/${c.total}</b> publicadas</span>
  <span class="gz-seta" aria-hidden="true"></span>
 </header>
 <div class="gz-caderno-corpo" data-g="corpo">
  ${c.nota ? `<p class="gz-nota"><b>Nota da redação:</b> ${c.nota}</p>` : ''}
  <div class="gz-colunas">${c.cartoes}</div>
 </div>
</section>`,

  resumo: r => {
    const campos = [
      ['Dificuldade', r.dificuldade ? `${r.dificuldade}/10` : ''],
      ['Tempo para 100%', r.horas],
      ['Jogadas', r.jogadas],
      ['Perdíveis', r.perdiveis === 0 ? 'Nenhuma' : r.perdiveis],
      ['Online', r.online],
      ['Nível do jogo', r.nivel],
    ].filter(([, v]) => v !== undefined && v !== '' && v !== null);
    return `<dl class="gz-ficha">${campos.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
${r.resumo ? `<p class="gz-resumo">${r.resumo}</p>` : ''}`;
  },

  roteiro: passos => `<ol class="gz-editorial">${passos.map((p, i) => `<li><span class="gz-editorial-n">${i + 1}</span><div>
  <h3>${p.titulo}</h3><p>${p.texto}</p>
  ${p.capitulo || p.rota ? `<p class="gz-ref">${p.capitulo ? `<a href="${p.capitulo}">Ir ao caderno</a>` : ''}${p.capitulo && p.rota ? ' · ' : ''}${p.rota ? `<a href="${p.rota}">Ver na pauta</a>` : ''}</p>` : ''}</div></li>`).join('')}</ol>`,

  progresso: p => {
    tiragem(p.pagina);
    document.querySelectorAll('[data-t="feitas"]').forEach(el => { el.textContent = `${p.feitas}/${p.total}`; });
    document.querySelectorAll('[data-t="pct"]').forEach(el => { el.textContent = `${p.pct}%`; });
    document.querySelectorAll('[data-g="progresso"]').forEach(el => {
      el.textContent = p.pagina === 'rota' ? `${p.feitas} de ${p.total} pautas apuradas` : `${p.feitas} de ${p.total} matérias publicadas`;
    });
    if (p.raridade) document.querySelectorAll('[data-t="raridade"]').forEach(el => {
      el.innerHTML = p.raridade.map(r => `<span><b>${CHAPEU[r.chave]}</b> ${r.feitas}/${r.total}</span>`).join('');
    });
    // Transições (a faixa EXTRA) só depois da primeira pintura, para não animar tudo ao abrir a página
    if (!document.documentElement.classList.contains('gz-anima')) requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('gz-anima')));
  },

  // ---------------------------------------------------------------- rota (a pauta da redação)
  tarefa: t => `<div class="gz-item" data-g="tarefa" id="${esc(t.id)}">
 <label class="gz-item-cab"><input type="checkbox" data-id="${esc(t.id)}"><span class="gz-item-tit">${t.titulo}</span></label>
 ${t.etiquetas.length || t.conquistas.length ? `<div class="gz-etqs">${t.etiquetas.map(e => `<span class="gz-etq"${e.papel ? ` data-papel="${e.papel}"` : ''}>${e.texto}</span>`).join('')}${t.conquistas.map(c => `<a class="gz-etq gz-etq-materia" href="${c.href}">▸ ${c.nome}</a>`).join('')}</div>` : ''}
 <details class="gz-como" data-g="como"><summary>Como apurar</summary><div><p>${t.desc}</p>${t.materiais.length ? `<p><b>Material:</b> ${t.materiais.map(m => `${m.n} ${m.nome}`).join(' · ')}</p>` : ''}${t.linhaFontes}</div></details>
</div>`,

  etapa: e => `<article class="gz-pauta" data-g="etapa" id="${e.id}" data-parte="${esc(e.parte)}">
 <header class="gz-pauta-cab" data-g="cabeca">
  <span class="gz-pauta-n">Pauta<b>${e.num}</b></span>
  <div><h3>${e.titulo}</h3><p>${e.subtitulo}</p></div>
  <span class="gz-pauta-tag">${e.tag}</span>
  <b class="gz-pauta-cont" data-g="contagem">0/${e.total}</b>
  <span class="gz-seta" aria-hidden="true"></span>
 </header>
 <div class="gz-pauta-corpo" data-g="corpo">
  ${e.nota ? `<p class="gz-nota"><b>Por que agora:</b> ${e.nota}</p>` : ''}
  <div class="gz-itens">${e.cartoes}</div>
 </div>
 <div class="gz-fechada" aria-hidden="true">Edição fechada</div>
</article>`,

  divisor: p => `<div class="gz-divisor" data-g="divisor" data-parte="${esc(p.id)}"><h2>${p.titulo}</h2><p>${p.texto}</p></div>`,
  aba: a => `<a class="gz-aba" role="tab" href="#${a.id}" data-g="aba" data-aba="${a.id}">${esc(ROTULO_NAV[a.titulo] || a.titulo)}${a.contar ? ` <span data-g="contagem-aba" data-parte="${a.id}"></span>` : ''}</a>`,
  mapa: partes => partes.map(p => `<div class="gz-indice"><span class="gz-indice-rot">Índice</span>${p.etapas.map(e => `<button type="button" class="gz-indice-n" data-g="ir-etapa" data-etapa="${e.i}" aria-label="Ir para a pauta ${e.num}: ${esc(e.titulo)}"><span>${e.num}</span></button>`).join('')}</div>`).join(''),

  // Red Bricks = classificados: um anúncio por bloco, que "sai" quando a tarefa que o libera é marcada
  marcos: grupos => grupos.map(g => `<div class="gz-classificados" data-g="grupo-marcos">${g.marcos.map(m => `<button type="button" class="gz-anuncio" data-g="marco" data-ms="${m.i}" data-unlock="${esc(m.unlock)}" aria-label="${esc(m.nome)}"><b>${m.rotulo}</b><small>${esc(m.nome)}</small></button>`).join('')}<span class="g-sr" data-g="grupo-contagem"></span></div>`).join(''),
  marcoDetalhe: (m, aceso) => `<b>${m.nome}</b>${m.detalhe ? ` · ${m.detalhe}` : ''}${aceso ? ' · <span class="gz-obtido">encontrado</span>' : ''}`,
  marcosTabela: partes => partes.map(p => `<table class="gz-tabela"><thead><tr><th>Red Brick</th><th>Onde</th><th>Pauta</th></tr></thead><tbody>${p.marcos.map(m => `<tr data-unlock="${esc(m.unlock)}"><td>${m.nome}</td><td>${m.detalhe || ''}</td><td><a href="#${esc(m.unlock)}">${m.etapaNum}</a></td></tr>`).join('')}</tbody></table>`).join(''),
  comoLer: x => `${x.fluxo.length ? `<ol class="gz-fluxo">${x.fluxo.map(f => `<li><span class="gz-etq" data-papel="${f.papel}">${f.rotulo}</span><p>${f.texto}</p></li>`).join('')}</ol>` : ''}
${x.legenda.length ? `<p class="gz-legenda">${x.legenda.map(l => `<span><span class="gz-etq" data-papel="${l.papel}">${l.rotulo}</span> ${l.texto}</span>`).join('')}</p>` : ''}${x.nota ? `<p class="gz-nota-leve">${x.nota}</p>` : ''}`,
  metaRota: n => `${n.etapas} pautas · ${n.tarefas} tarefas`,
};
