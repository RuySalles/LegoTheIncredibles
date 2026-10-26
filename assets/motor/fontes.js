// Fontes e pontos a confirmar (data/fontes.json), compartilhados pelas duas páginas.
// Aqui só se montam os dados; o desenho é do tema (tema.fontes, tema.confirmar, tema.linhaFontes).

export function sourceIndex(fontes) {
  return Object.fromEntries((fontes.sources || []).map(s => [s.id, s]));
}

// Fontes citadas por uma dica/tarefa: [{ id, rotulo, url }]
export function srcList(ids, index) {
  return (ids || []).map(id => index[id]).filter(Boolean).map(s => ({ id: s.id, rotulo: s.short || s.title, url: s.url || '' }));
}

/** Preenche [data-g="fontes"] e [data-g="confirmar"]; esconde [data-g="sec-confirmar"] se não houver pontos. */
export function renderSources(t, fontes, usage = {}) {
  const index = sourceIndex(fontes);
  const lista = (fontes.sources || []).map(s => ({ id: s.id, titulo: s.title, url: s.url || '', sobre: s.about || '', usos: usage[s.id] || 0 }));
  const pontos = (fontes.confirm || []).map(c => ({ texto: c.text, fontes: srcList(c.sources, index) }));
  document.querySelectorAll('[data-g="fontes"]').forEach(el => { el.innerHTML = t.fontes(lista); });
  document.querySelectorAll('[data-g="confirmar"]').forEach(el => { el.innerHTML = t.confirmar(pontos); });
  document.querySelectorAll('[data-g="total-fontes"]').forEach(el => { el.textContent = lista.length; });
  document.querySelectorAll('[data-g="total-confirmar"]').forEach(el => { el.textContent = pontos.length; });
  if (!pontos.length) document.querySelectorAll('[data-g="sec-confirmar"]').forEach(el => { el.hidden = true; });
}
