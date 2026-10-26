// TEMA deste guia: "O Dossiê da Família" (docs/direcao-de-arte.md, prancha docs/pranchas/conceito-4.html).
// O guia é o arquivo do agente Rick Dicker sobre a família Pêra: cada capítulo é uma pasta manilha,
// cada conquista uma ficha datilografada, marcar é carimbar "caso encerrado". Cores do uniforme dos Incríveis.
//
// Cada função recebe os DADOS de uma peça e devolve o HTML dela (contrato em assets/motor/padrao.js).
import { esc } from '../motor/util.js';

const AMEACA = ['', 'baixa', 'moderada', 'alta', 'severa', 'extrema'];
const ROTULO_NAV = { Conquistas: 'Dossiê', 'Referência': 'Anexos' };
const link = f => f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.rotulo)}</a>` : `<span>${esc(f.rotulo)}</span>`;
const pad2 = n => String(n).padStart(2, '0');

// Ficha de controle: um quadrado por item, agrupados por pasta/fase; cada um leva ao item.
function controle(pagina) {
  const item = pagina === 'rota' ? '[data-g="tarefa"]' : '[data-g="conquista"]';
  const grupo = pagina === 'rota' ? '[data-g="etapa"]' : '[data-g="capitulo"]';
  const nome = el => (el.querySelector('.dz-nome, .dz-item-tit') || el).textContent.trim();
  document.querySelectorAll('[data-t="controle"]').forEach(box => {
    if (!box.dataset.pronto) {
      box.innerHTML = [...document.querySelectorAll(grupo)].map(g => `<span class="dz-grupo">${[...g.querySelectorAll(item)]
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
  // Barra do navegador no celular = fundo (mesa) de cada tema
  cores: { dark: '#1b1411', light: '#e8d6b3' },

  // ---------------------------------------------------------------- casca
  casca: ({ links, marca, rodape }) => ({
    topo: `<div class="dz-barra">
 <a class="dz-marca" href="index.html"><span class="dz-lacre-mini" aria-hidden="true">i</span><span>${esc(marca).replace('100%', '<b>100%</b>')}</span></a>
 <button type="button" class="dz-btn-menu" data-g="abrir-menu" aria-expanded="false"><span aria-hidden="true">☰</span> Pastas</button>
 <nav class="dz-nav" data-g="nav" aria-label="Navegação principal">${links.map(l => `<a href="${l.href}"${l.atual ? ' aria-current="page"' : ''}>${esc(ROTULO_NAV[l.rotulo] || l.rotulo)}</a>`).join('')}</nav>
 <button type="button" class="dz-btn-tema" data-g="alternar-tema"><span class="dz-lampada" aria-hidden="true"></span><span class="dz-tema-txt">Luz da mesa</span></button>
</div>`,
    rodape: `<div class="dz-rodape"><p class="dz-tw">— FIM DO ARQUIVO · PROCESSO Nº 818320 · ESTE DOCUMENTO SE AUTODESTRUIRÁ NUNCA —</p><p>${rodape}</p></div>`,
  }),

  // ---------------------------------------------------------------- fontes
  linhaFontes: fs => fs.length ? `<p class="dz-informantes"><b>INFORMANTES ·</b> ${fs.map(link).join(' · ')}</p>` : '',
  fontes: lista => `<ol class="dz-anexos">${lista.map((s, i) => `<li><span class="dz-anexo-n">${pad2(i + 1)}</span><div>
   <strong>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.titulo)}</a>` : esc(s.titulo)}</strong>
   ${s.sobre ? `<p>${s.sobre}</p>` : ''}${s.usos ? `<small>citado ${s.usos}×</small>` : ''}</div></li>`).join('')}</ol>`,
  confirmar: pontos => `<ul class="dz-pendencias">${pontos.map(p => `<li><p>${p.texto}</p>${p.fontes.length ? `<small>${p.fontes.map(link).join(' · ')}</small>` : ''}</li>`).join('')}</ul>`,

  // ---------------------------------------------------------------- conquistas
  conquista: c => {
    const sp = c.spoiler ? ' data-g-spoiler' : '';
    const chips = [
      `<span class="dz-chip dz-rar">${c.raridade.rotulo} · ${c.raridade.pct}</span>`,
      c.dificuldade ? `<span class="dz-chip">Ameaça ${AMEACA[c.dificuldade.n] || c.dificuldade.n}</span>` : '',
      c.tempo ? `<span class="dz-chip">${esc(c.tempo)}</span>` : '',
      c.solo ? '<span class="dz-chip">Só 1 jogador</span>' : '',
      c.online ? '<span class="dz-chip">Online</span>' : '',
    ].join('');
    return `<article class="dz-ficha" data-g="conquista" id="ach-${esc(c.id)}">
 <div class="dz-foto"><img src="${c.icone}" alt="" width="64" height="64" loading="lazy" decoding="async"></div>
 <div class="dz-ficha-corpo">
  <h3 class="dz-nome">${c.nome}</h3>
  <p class="dz-desc"${sp}>${c.desc ? `“${c.desc}”` : 'Conquista oculta'}</p>
  ${c.perdivel ? `<p class="dz-prazo"><b>PRAZO ·</b> ${c.perdivel}</p>` : ''}
  <p class="dz-dica"${sp}><b>PROCEDIMENTO ·</b> ${c.dica}</p>
  ${c.junto.length ? `<p class="dz-ref"><b>NA MESMA DILIGÊNCIA ·</b> ${c.junto.map(j => `<a href="${j.href}">${j.nome}</a>`).join(' · ')}</p>` : ''}
  ${c.naRota.length ? `<p class="dz-ref"><b>NA MISSÃO ·</b> ${c.naRota.map(r => `<a href="${r.href}">${esc(r.texto)}</a>`).join(' · ')}</p>` : ''}
  <div class="dz-ficha-pe">${chips}
   <label class="dz-enc"><input type="checkbox" data-id="${esc(c.id)}" aria-label="Encerrar o caso: ${esc(c.nome.replace(/<[^>]+>/g, ''))}"><span class="dz-enc-a">Encerrar caso</span><span class="dz-enc-b">Encerrado</span></label></div>
  ${c.linhaFontes}
 </div>
 <span class="dz-selo" aria-hidden="true">Caso encerrado</span>
</article>`;
  },

  capitulo: c => `<section class="dz-pasta" data-g="capitulo" id="${esc(c.id)}">
 <header class="dz-pasta-cab" data-g="cabeca">
  <span class="dz-aba">Pasta ${c.romano}</span>
  <div><h2>${c.titulo}</h2><p>${c.subtitulo}</p></div>
  <span class="dz-cont"><b data-g="contagem">0/${c.total}</b> encerrados</span>
  <span class="dz-seta" aria-hidden="true"></span>
 </header>
 <div class="dz-pasta-corpo" data-g="corpo">
  ${c.nota ? `<p class="dz-nota"><b>NOTA DO AGENTE ·</b> ${c.nota}</p>` : ''}
  <div class="dz-fichas">${c.cartoes}</div>
 </div>
</section>`,

  resumo: r => {
    const campos = [
      ['Nível de ameaça', r.dificuldade ? `${r.dificuldade}/10` : '', 'dz-campo-forte'],
      ['Horas de campo', r.horas],
      ['Operações', r.jogadas],
      ['Prazos (perdíveis)', r.perdiveis === 0 ? 'Nenhum' : r.perdiveis],
      ['Contato online', r.online],
      ['Dificuldade do jogo', r.nivel],
    ].filter(([, v]) => v !== undefined && v !== '' && v !== null);
    return `<div class="dz-campos">${campos.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><small>${k}</small><b>${v}</b></div>`).join('')}</div>
${r.resumo ? `<p class="dz-parecer"><b>PARECER ·</b> ${r.resumo}</p>` : ''}`;
  },

  roteiro: passos => `<ol class="dz-plano">${passos.map((p, i) => `<li><span class="dz-plano-n">${pad2(i + 1)}</span><div>
  <h3>${p.titulo}</h3><p>${p.texto}</p>
  ${p.capitulo || p.rota ? `<p class="dz-plano-links">${p.capitulo ? `<a href="${p.capitulo}">Abrir a pasta</a>` : ''}${p.rota ? `<a href="${p.rota}">Ver na missão</a>` : ''}</p>` : ''}</div></li>`).join('')}</ol>`,

  progresso: p => {
    controle(p.pagina);
    document.querySelectorAll('[data-t="feitas"]').forEach(el => { el.textContent = `${p.feitas}/${p.total}`; });
    document.querySelectorAll('[data-t="pct"]').forEach(el => { el.textContent = `${p.pct}%`; });
    document.querySelectorAll('[data-g="progresso"]').forEach(el => {
      el.textContent = p.pagina === 'rota' ? `${p.feitas} de ${p.total} tarefas cumpridas` : `${p.feitas} de ${p.total} casos encerrados`;
    });
    if (p.raridade) document.querySelectorAll('[data-t="raridade"]').forEach(el => {
      el.innerHTML = p.raridade.map(r => `<span data-rar="${r.chave}"><b>${r.rotulo}</b> ${r.feitas}/${r.total}</span>`).join('');
    });
    // Transições (o carimbo) só depois da primeira pintura, para não carimbar tudo ao abrir a página
    if (!document.documentElement.classList.contains('dz-anima')) requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('dz-anima')));
  },

  // ---------------------------------------------------------------- rota
  tarefa: t => `<div class="dz-item" data-g="tarefa" id="${esc(t.id)}">
 <label class="dz-item-cab"><input type="checkbox" data-id="${esc(t.id)}"><span class="dz-item-tit">${t.titulo}</span></label>
 ${t.etiquetas.length || t.conquistas.length ? `<div class="dz-etqs">${t.etiquetas.map(e => `<span class="dz-chip"${e.papel ? ` data-papel="${e.papel}"` : ''}>${e.texto}</span>`).join('')}${t.conquistas.map(c => `<a class="dz-chip dz-caso" href="${c.href}"><span aria-hidden="true">i</span> ${c.nome}</a>`).join('')}</div>` : ''}
 <details class="dz-como" data-g="como"><summary>Procedimento</summary><div><p>${t.desc}</p>${t.materiais.length ? `<p><b>Material:</b> ${t.materiais.map(m => `${m.n} ${m.nome}`).join(' · ')}</p>` : ''}${t.linhaFontes}</div></details>
</div>`,

  etapa: e => `<article class="dz-fase" data-g="etapa" id="${e.id}" data-parte="${esc(e.parte)}">
 <header class="dz-fase-cab" data-g="cabeca">
  <span class="dz-fase-n">Fase<b>${e.num}</b></span>
  <div><h3>${e.titulo}</h3><p>${e.subtitulo}</p></div>
  <span class="dz-fase-tag">${e.tag}</span>
  <b class="dz-fase-cont" data-g="contagem">0/${e.total}</b>
  <span class="dz-seta" aria-hidden="true"></span>
  <span class="dz-selo dz-selo-fase" aria-hidden="true">Fase concluída</span>
 </header>
 <div class="dz-fase-corpo" data-g="corpo">
  ${e.nota ? `<p class="dz-nota"><b>POR QUE AGORA ·</b> ${e.nota}</p>` : ''}
  <div class="dz-itens">${e.cartoes}</div>
 </div>
</article>`,

  divisor: p => `<div class="dz-divisor" data-g="divisor" data-parte="${esc(p.id)}"><h2>${p.titulo}</h2><p>${p.texto}</p></div>`,
  aba: a => `<a class="dz-aba-link" role="tab" href="#${a.id}" data-g="aba" data-aba="${a.id}">${esc(ROTULO_NAV[a.titulo] || a.titulo)}${a.contar ? ` <span data-g="contagem-aba" data-parte="${a.id}"></span>` : ''}</a>`,
  mapa: partes => partes.map(p => `<div class="dz-mapa">${p.etapas.map(e => `<button type="button" class="dz-mapa-n" data-g="ir-etapa" data-etapa="${e.i}" aria-label="Ir para a fase ${e.num}: ${esc(e.titulo)}"><span>${e.num}</span></button>`).join('')}</div>`).join(''),

  marcos: grupos => grupos.map(g => `<div class="dz-provas" data-g="grupo-marcos">${g.marcos.map(m => `<button type="button" class="dz-prova" data-g="marco" data-ms="${m.i}" data-unlock="${esc(m.unlock)}" aria-label="${esc(m.nome)}">${m.rotulo}</button>`).join('')}<span class="g-sr" data-g="grupo-contagem"></span></div>`).join(''),
  marcoDetalhe: (m, aceso) => `<b>${m.nome}</b>${m.detalhe ? ` · ${m.detalhe}` : ''}${aceso ? ' · <span class="dz-obtido">obtido</span>' : ''}`,
  marcosTabela: partes => partes.map(p => `<table class="dz-tabela"><thead><tr><th>Red Brick</th><th>Onde</th><th>Fase</th></tr></thead><tbody>${p.marcos.map(m => `<tr data-unlock="${esc(m.unlock)}"><td>${m.nome}</td><td>${m.detalhe || ''}</td><td><a href="#${esc(m.unlock)}">${m.etapaNum}</a></td></tr>`).join('')}</tbody></table>`).join(''),
  comoLer: x => `${x.fluxo.length ? `<ol class="dz-fluxo">${x.fluxo.map(f => `<li data-papel="${f.papel}"><span class="dz-chip" data-papel="${f.papel}">${f.rotulo}</span><p>${f.texto}</p></li>`).join('')}</ol>` : ''}
${x.legenda.length ? `<p class="dz-legenda">${x.legenda.map(l => `<span><span class="dz-chip" data-papel="${l.papel}">${l.rotulo}</span> ${l.texto}</span>`).join('')}</p>` : ''}${x.nota ? `<p class="dz-nota-leve">${x.nota}</p>` : ''}`,
  metaRota: n => `${n.etapas} fases · ${n.tarefas} tarefas`,
};
