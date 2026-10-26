// Aplica o tema salvo (ou o do sistema) antes da página ser pintada, para não "piscar".
// Carregado sem defer no <head> de todas as páginas. A chave deve ser a mesma de assets/guia.config.js.
(function () {
  var t = null;
  try { t = localStorage.getItem('incredibles-theme'); } catch (e) {}
  if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();
