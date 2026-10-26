// Configuração do guia: identidade e chaves de salvamento. Lida pelo motor e pelo tema.
// Conteúdo (conquistas, rota, fontes) fica em data/*.json; o visual fica em assets/tema/.

// Prefixo de TODAS as chaves salvas no navegador (progresso, tema, filtros).
// Nunca mude depois de publicar: quem já usa o site perderia o progresso.
// Se mudar antes de publicar, mude também em assets/motor/theme-init.js.
export const PREFIX = 'incredibles';

export const GAME = 'LEGO The Incredibles';
export const BRAND = 'Incredibles 100%';      // nome curto do guia (o tema decide onde e como aparece)

// Este guia tem rota de aceleração (rota.html)? Se não tiver, apague rota.html e data/rota.json.
export const HAS_ROTA = true;

export const FOOTER = `${GAME} · Guia comunitário não oficial. Nomes, marcas e ícones de conquistas pertencem aos seus respectivos proprietários. `
  + 'Esta página não é afiliada nem endossada pelos donos do jogo nem pela Valve.';
