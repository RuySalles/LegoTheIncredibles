# Instruções para IAs — LEGO The Incredibles (guia de conquistas)

Fonte única de instruções para qualquer IA neste repositório. `CLAUDE.md` apenas importa este arquivo.
Este guia foi criado com a skill **guia-conquistas**; os padrões completos (voz, tema, fontes) estão nela.

## Regras que não se quebram
- **IDs são eternos.** Conquistas usam o id da Steam; tarefas usam `tN` com o próximo número livre. Nunca renomeie, apague ou reaproveite; para tirar uma tarefa, aposente o id em `data/ids.lock.json`. O `PREFIX` de `assets/guia.config.js` e as chaves `-v1` também nunca mudam.
- **Conteúdo só nos JSON** (`data/`). Dicas, capítulos e números nunca vão para o HTML; no HTML e no tema ficam só os textos criativos da interface (topo, títulos de seção, rótulos).
- **Toda dica e tarefa cita fontes** (`sources`, ids de `data/fontes.json`). Divergência entre fontes vai para `confirm`, dizendo quem afirma o quê. Nunca copie texto das fontes: resuma com palavras próprias.
- **Back-end padrão, front-end único.** `assets/motor/` é igual em todos os guias: nunca edite aqui (melhorias vão para a skill e depois são copiadas). O visual é todo deste guia: `assets/tema/` e a composição de `index.html`/`rota.html`, sempre mantendo os ganchos `data-g` (contrato em `references/motor.md` da skill).
- **Mudança de conceito visual passa pela direção de arte** (pranchas em `docs/pranchas/` e aprovação do Ruy). Não copie o visual de outro guia.
- **Tema escuro e claro sempre**, contraste mínimo 4,5:1, celular primeiro (375 px sem rolagem lateral, alvos de 44 px).
- **`python tools/validate.py` termina com 0 erros** antes de qualquer commit. Avisos são lacunas de conteúdo: resolva ou explique.

## Como trabalhar
- Rodar: `py -m http.server 8000` (ou o preview "site" de `.claude/launch.json`) e conferir as duas páginas nos dois temas e em 375 px.
- Conquistas novas na Steam: `python tools/steam_importar.py` (mantém o que foi escrito à mão).
- Mudou números ou visual: `python tools/gerar_og.py`.
- Reestruturação grande: antes, backup em `backups/AAAA-MM-DD_HH-MM/` (zip + LEIA-ME com commit e como restaurar) e uma tag git local; depois, trabalhe em fases ("Phase 1: … (no visual change)").
- Commits em inglês, com corpo explicando o quê e o porquê; diga quando IDs e chaves de progresso não mudaram.
