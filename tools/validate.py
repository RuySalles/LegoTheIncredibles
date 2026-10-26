#!/usr/bin/env python3
"""Valida os dados do site antes de publicar.

Uso:
    python tools/validate.py          # verifica tudo (roda também no GitHub a cada push)
    python tools/validate.py --lock   # registra IDs novos em data/ids.lock.json

Erros impedem a publicação (o check fica vermelho). Avisos apontam lacunas de conteúdo
(dica sem fonte, tema ainda no esqueleto...) que não quebram o site.
Só usa a biblioteca padrão do Python.
"""
import json, re, sys
from datetime import date
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'): _s.reconfigure(encoding='utf-8')  # acentos no console do Windows
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
LOCK = DATA / 'ids.lock.json'
errors, warnings = [], []

def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)

def load(name, required=True):
    p = DATA / name
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        err(f'{name}: JSON inválido na linha {e.lineno}, coluna {e.colno}: {e.msg}')
    except FileNotFoundError:
        if required: err(f'{name}: arquivo não encontrado')
    return None

ALLOWED_TAGS = {'em', 'strong', 'b', 'a', 'br'}
def check_html(where, text, allow_empty=False):
    """Campos de texto aceitam HTML simples; confere se as tags estão fechadas e são permitidas."""
    if not isinstance(text, str) or not text.strip():
        if not allow_empty: err(f'{where}: texto vazio')
        return
    for tag in re.findall(r'</?\s*([a-zA-Z0-9]+)', text):
        if tag.lower() not in ALLOWED_TAGS:
            err(f'{where}: tag <{tag}> não permitida (use só {", ".join(sorted(ALLOWED_TAGS))})')
    for tag in ALLOWED_TAGS - {'br'}:
        opened = len(re.findall(rf'<{tag}(\s[^>]*)?>', text)); closed = text.count(f'</{tag}>')
        if opened != closed:
            err(f'{where}: <{tag}> aberto {opened}x e fechado {closed}x')
    if re.search(r'\bTODO\b|\bXXX\b|\b[Aa] escrever\b', text): warn(f'{where}: texto ainda marcado como pendente')

def check_refs(where, ids, valid, what):
    if ids is None: return
    if not isinstance(ids, list): err(f'{where}: deve ser uma lista de ids de {what}'); return
    for x in ids:
        if x not in valid: err(f'{where}: "{x}" não existe em {what}')

# ---------------------------------------------------------------- config e tema
def read_config():
    cfg = (ROOT / 'assets/guia.config.js').read_text(encoding='utf-8')
    prefix = re.search(r"export const PREFIX = '([^']*)'", cfg)
    has_rota = re.search(r'export const HAS_ROTA = (true|false)', cfg)
    if not prefix or not re.fullmatch(r'[a-z][a-z0-9-]*', prefix.group(1)):
        err('guia.config.js: PREFIX deve ser curto, minúsculo e sem espaços (ex.: "hobbit")')
    init = (ROOT / 'assets/motor/theme-init.js').read_text(encoding='utf-8')
    if prefix and f"'{prefix.group(1)}-theme'" not in init:
        err(f'theme-init.js: a chave do tema deve ser "{prefix.group(1)}-theme" (igual ao PREFIX de guia.config.js)')
    return bool(has_rota and has_rota.group(1) == 'true')

# Ganchos que o motor procura na página (HTML do tema) e no que o tema.js devolve.
HOOKS_PAGE = {
    'index.html': ['topo', 'rodape', 'capitulos', 'busca', 'filtro', 'proxima', 'vazio', 'fontes', 'confirmar'],
    'rota.html': ['topo', 'rodape', 'etapas', 'abas', 'painel-rota', 'painel-ref', 'busca', 'proxima', 'vazio', 'fontes', 'confirmar'],
}
# Peças de identidade: o tema precisa desenhar estas (senão o guia sai com o esqueleto neutro do motor).
PIECES = {
    'conquistas': {'casca': [], 'conquista': ['data-g="conquista"', 'data-id'], 'capitulo': ['data-g="capitulo"', 'data-g="cabeca"', 'data-g="corpo"', 'data-g="contagem"'], 'progresso': []},
    'rota': {'tarefa': ['data-g="tarefa"', 'data-id', 'data-g="como"'], 'etapa': ['data-g="etapa"', 'data-parte', 'data-g="cabeca"', 'data-g="corpo"', 'data-g="contagem"']},
}
def check_tema(has_rota):
    css = (ROOT / 'assets/tema/tema.css').read_text(encoding='utf-8')
    js = (ROOT / 'assets/tema/tema.js').read_text(encoding='utf-8')
    for f in ['assets/tema/tema.css', 'assets/tema/tema.js', 'assets/tema/og.html', 'index.html'] + (['rota.html'] if has_rota else []):
        if 'TEMA-ESQUELETO' in (ROOT / f).read_text(encoding='utf-8'):
            warn(f'{f}: ainda é o esqueleto neutro (TEMA-ESQUELETO). O guia precisa do próprio front-end antes de publicar (references/direcao-de-arte.md).')
    if '[data-theme="light"]' not in css or '[data-theme="dark"]' not in css:
        err('tema.css: defina os dois temas, [data-theme="dark"] e [data-theme="light"]')
    for page, hooks in HOOKS_PAGE.items():
        if page == 'rota.html' and not has_rota: continue
        html = (ROOT / page).read_text(encoding='utf-8')
        for h in hooks:
            if f'data-g="{h}"' not in html: err(f'{page}: falta o gancho data-g="{h}" (o motor precisa dele; veja references/motor.md)')
    for grupo, pieces in PIECES.items():
        if grupo == 'rota' and not has_rota: continue
        for name, hooks in pieces.items():
            m = re.search(rf'^\s*{name}\s*:', js, re.M)
            if not m:
                warn(f'tema.js: a peça "{name}" ainda usa o renderizador neutro do motor; desenhe-a no tema.')
                continue
            for h in hooks:
                if h not in js: err(f'tema.js: "{name}" precisa manter o gancho {h} no HTML que devolve (veja references/motor.md)')

def check_placeholders():
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix in {'.html', '.js', '.css', '.json', '.md', '.yml', '.svg', '.py'} and '.git' not in p.parts and p.name != 'validate.py':
            if re.search(r'\{\{[A-Z_]+\}\}', p.read_text(encoding='utf-8', errors='ignore')):
                err(f'{p.relative_to(ROOT)}: ainda tem marcadores {{{{...}}}} do modelo')

# ---------------------------------------------------------------- fontes
def check_fontes(d):
    ids = []
    for i, s in enumerate(d.get('sources', [])):
        w = f'fontes.json sources[{i}]'
        sid = s.get('id', '')
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', str(sid)): err(f'{w}: "id" deve ser curto, minúsculo e sem espaços (ex.: "ign")')
        ids.append(sid)
        if not s.get('title'): err(f'{w}: campo "title" obrigatório')
        if s.get('url') and not str(s['url']).startswith(('http://', 'https://')): err(f'{w}: "url" deve começar com https://')
        if s.get('about'): check_html(f'{w} about', s['about'])
    dup = sorted({x for x in ids if ids.count(x) > 1})
    if dup: err(f'fontes.json: ids repetidos: {", ".join(dup)}')
    for i, c in enumerate(d.get('confirm', [])):
        check_html(f'fontes.json confirm[{i}]', c.get('text'))
        check_refs(f'fontes.json confirm[{i}] sources', c.get('sources'), set(ids), 'fontes.json')
    if len([s for s in d.get('sources', []) if s.get('url')]) < 2:
        warn('fontes.json: menos de duas fontes externas com link. Todo guia cita os guias consultados.')
    return set(ids)

# ---------------------------------------------------------------- rota
COLORS = {'accent', 'info', 'warm', 'ok', 'danger', 'special'}
def check_rota(d, src_ids):
    ids = []
    types = set()
    for i, t in enumerate(d.get('tagTypes', [])):
        w = f'rota.json tagTypes[{i}]'
        if not t.get('type') or not t.get('label'): err(f'{w}: precisa de "type" e "label"')
        if t.get('color') not in COLORS: err(f'{w}: "color" deve ser um de {", ".join(sorted(COLORS))}')
        for f in ('flow', 'explain'):
            if t.get(f): check_html(f'{w} {f}', t[f])
        types.add(t.get('type'))
    mats = {m.get('key') for m in d.get('materials', [])}
    for i, m in enumerate(d.get('materials', [])):
        if not m.get('key') or not m.get('name'): err(f'rota.json materials[{i}]: precisa de "key" e "name"')
    if not d.get('stages'): err('rota.json: nenhuma etapa em "stages"')
    part_ids = set()
    for si, st in enumerate(d.get('stages', []), 1):
        w = f'rota.json etapa {si:02d} ("{st.get("title", "?")}")'
        for f in ('title', 'subtitle', 'tag'):
            if not st.get(f): err(f'{w}: campo "{f}" obrigatório')
        if st.get('note'): check_html(f'{w} note', st['note'])
        else: warn(f'{w}: sem "note" explicando por que esta etapa vem aqui')
        if 'part' in st:
            p = st['part']
            if not (isinstance(p, dict) and p.get('title') and p.get('text')): err(f'{w}: "part" precisa de "title" e "text"')
            elif not re.fullmatch(r'[a-z][a-z0-9-]*', str(p.get('id', ''))) or p['id'] in ('jornada', 'referencia'): err(f'{w}: "part.id" deve ser curto, minúsculo e sem espaços (ex.: "tesouro"); vira o endereço da aba')
            else: check_html(f'{w} part', p['text']); part_ids.add(p['id'])
        if not st.get('tasks'): err(f'{w}: etapa sem tarefas')
        for t in st.get('tasks', []):
            tid = t.get('id', '?'); tw = f'{w} tarefa {tid}'
            if not re.fullmatch(r't\d+', str(tid)): err(f'{tw}: id deve ser "t" + número (ex.: t38)')
            ids.append(tid)
            check_html(f'{tw} title', t.get('title')); check_html(f'{tw} desc', t.get('desc'))
            for m in t.get('materials', []):
                if not (isinstance(m, list) and len(m) == 2 and m[0] in mats and isinstance(m[1], int) and m[1] > 0):
                    err(f'{tw}: material inválido {m} (formato ["chave", quantidade]; chaves: {", ".join(sorted(mats)) or "nenhuma"})')
            for g in t.get('tags', []):
                if not g.get('text'): err(f'{tw}: etiqueta sem "text"')
                if g.get('type') and g['type'] not in types: err(f'{tw}: tipo de etiqueta "{g["type"]}" não está em "tagTypes" ({", ".join(sorted(types))})')
            check_refs(f'{tw} sources', t.get('sources'), src_ids, 'fontes.json')
    dup = sorted({x for x in ids if ids.count(x) > 1})
    if dup: err(f'rota.json: ids de tarefa repetidos: {", ".join(dup)}')
    for b in (d.get('milestones') or {}).get('items', []):
        w = f'rota.json milestones "{b.get("name", "?")}"'
        for f in ('label', 'name', 'unlock'):
            if not b.get(f): err(f'{w}: campo "{f}" obrigatório')
        if b.get('unlock') not in ids: err(f'{w}: "unlock" aponta para "{b.get("unlock")}", que não existe')
        if 'group' in b and b['group'] not in part_ids: err(f'{w}: "group" deve ser o id de uma parte ({", ".join(sorted(part_ids)) or "nenhuma"}); sem group = parte principal')
    return ids

# ---------------------------------------------------------- conquistas
def check_conquistas(d, src_ids, task_ids, has_rota):
    ach = d.get('achievements', {})
    if not ach: err('conquistas.json: nenhuma conquista (rode tools/steam_importar.py)')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(d.get('updated', ''))): err('conquistas.json: "updated" deve ser AAAA-MM-DD')
    else:
        try: date.fromisoformat(d['updated'])
        except ValueError: err('conquistas.json: "updated" não é uma data válida')
    check_html('conquistas.json intro', d.get('intro'))
    if d.get('completion') and d['completion'] not in ach: err(f'conquistas.json: "completion" aponta para "{d["completion"]}", que não existe')

    ov = d.get('overview') or {}
    if not ov: warn('conquistas.json: sem "overview" (resumo do 100%: dificuldade, tempo, jogadas)')
    else:
        if not (isinstance(ov.get('difficulty'), int) and 1 <= ov['difficulty'] <= 10): warn('conquistas.json overview: "difficulty" deve ser de 1 a 10')
        if not ov.get('hours'): warn('conquistas.json overview: "hours" (tempo estimado para 100%) vazio')
        if ov.get('summary'): check_html('conquistas.json overview summary', ov['summary'])
    chapter_ids = {c.get('id') for c in d.get('chapters', [])}
    if not d.get('roadmap'): warn('conquistas.json: sem "roadmap" (a ordem inteligente de fazer o 100%)')
    for i, s in enumerate(d.get('roadmap', [])):
        w = f'conquistas.json roadmap[{i}]'
        check_html(f'{w} title', s.get('title')); check_html(f'{w} text', s.get('text'))
        if s.get('chapter') and s['chapter'] not in chapter_ids: err(f'{w}: "chapter" "{s["chapter"]}" não existe')
        if s.get('rota') and s['rota'] not in task_ids and not re.fullmatch(r'etapa-\d+', s['rota']): err(f'{w}: "rota" "{s["rota"]}" não é uma tarefa da rota')

    seen = []
    for c in d.get('chapters', []):
        for f in ('id', 'title', 'subtitle'):
            if not c.get(f): err(f'conquistas.json capítulo: campo "{f}" obrigatório')
        if c.get('note'): check_html(f'conquistas.json capítulo "{c.get("id")}" note', c['note'])
        for a in c.get('achievements', []):
            if a not in ach: err(f'conquistas.json capítulo "{c.get("id")}": conquista "{a}" não existe em "achievements"')
            seen.append(a)
    dup = sorted({x for x in seen if seen.count(x) > 1})
    if dup: err(f'conquistas.json: conquistas em mais de um capítulo: {", ".join(dup)}')
    missing = sorted(set(ach) - set(seen))
    if missing: err(f'conquistas.json: conquistas fora de qualquer capítulo: {", ".join(missing)}')

    no_src = []
    for aid, a in ach.items():
        w = f'conquistas.json {aid}'
        check_html(f'{w} name', a.get('name'))
        check_html(f'{w} desc', a.get('desc'), allow_empty=bool(a.get('hidden')))
        check_html(f'{w} tip', a.get('tip'))
        if not isinstance(a.get('pct'), (int, float)) or not 0 <= a['pct'] <= 100: err(f'{w}: "pct" deve estar entre 0 e 100')
        if not (ROOT / 'assets' / 'achievements' / f'{aid.lower()}.jpg').is_file(): err(f'{w}: ícone assets/achievements/{aid.lower()}.jpg não encontrado')
        if 'missable' in a and a['missable'] is not True: check_html(f'{w} missable', a['missable'])
        if 'difficulty' in a and not (isinstance(a['difficulty'], int) and 1 <= a['difficulty'] <= 5): err(f'{w}: "difficulty" deve ser de 1 a 5')
        if 'time' in a and not (isinstance(a['time'], str) and a['time'].strip()): err(f'{w}: "time" deve ser um texto (ex.: "~10 min")')
        check_refs(f'{w} together', a.get('together'), set(ach) - {aid}, 'outras conquistas')
        if a.get('rota'):
            if not has_rota: err(f'{w}: "rota" usado, mas o guia não tem rota (HAS_ROTA = false)')
            else: check_refs(f'{w} rota', a['rota'], set(task_ids), 'tarefas da rota')
        check_refs(f'{w} sources', a.get('sources'), src_ids, 'fontes.json')
        if not a.get('sources'): no_src.append(aid)
    if no_src: warn(f'conquistas.json: {len(no_src)} dica(s) sem fonte: {", ".join(no_src[:8])}{"…" if len(no_src) > 8 else ""}')
    return list(ach)

# ---------------------------------------------------------------- main
def main():
    for f in ['index.html', 'favicon.svg', 'assets/guia.config.js', 'assets/tema/tema.js', 'assets/tema/tema.css', 'assets/tema/og.html',
              *[f'assets/motor/{m}' for m in ('theme-init.js', 'util.js', 'casca.js', 'checklist.js', 'fontes.js', 'save.js', 'padrao.js', 'conquistas.js', 'motor.css')]]:
        if not (ROOT / f).is_file(): err(f'arquivo obrigatório ausente: {f}')
    if errors: return report({})
    has_rota = read_config()
    check_placeholders()
    check_tema(has_rota)
    if has_rota:
        for f in ['rota.html', 'assets/motor/rota.js']:
            if not (ROOT / f).is_file(): err(f'HAS_ROTA = true, mas falta {f}')

    fontes = load('fontes.json')
    src_ids = check_fontes(fontes) if fontes else set()
    rota = load('rota.json', required=has_rota) if has_rota else None
    task_ids = check_rota(rota, src_ids) if rota else []
    conq = load('conquistas.json')
    ids = {'rota': task_ids, 'conquistas': check_conquistas(conq, src_ids, task_ids, has_rota) if conq else []}

    # Trava de IDs: um id publicado nunca pode sumir (apagaria o progresso salvo de quem usa o site).
    lock = json.loads(LOCK.read_text(encoding='utf-8')) if LOCK.is_file() else {'rota': [], 'conquistas': []}
    if '--lock' in sys.argv and not errors:
        for k in ids: lock[k] = sorted(set(lock.get(k, [])) | set(ids[k]), key=lambda x: (len(x), x))
        LOCK.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
        print(f'IDs registrados em {LOCK.relative_to(ROOT)}.')
    retired = lock.get('aposentados', {})
    for k in ids:
        back = sorted(set(retired.get(k, [])) & set(ids[k]))
        if back: err(f'{k}: IDs aposentados não podem ser reutilizados: {", ".join(back)}. Use o próximo número livre.')
        gone = sorted(set(lock.get(k, [])) - set(ids[k]) - set(retired.get(k, [])))
        if gone: err(f'{k}: IDs publicados que sumiram: {", ".join(gone)}. Não apague nem renomeie IDs; se a tarefa não vale mais, mude o texto ou aposente o id (veja o README).')
        new = sorted(set(ids[k]) - set(lock.get(k, [])))
        if new: err(f'{k}: IDs novos ainda não registrados: {", ".join(new)}. Rode "python tools/validate.py --lock" ou adicione-os em data/ids.lock.json.')
    report(ids)

def report(ids):
    for w in warnings: print('AVISO:', w)
    if errors:
        print(f'\n{len(errors)} problema(s) encontrado(s):')
        for e in errors: print(' -', e)
        sys.exit(1)
    print(f'OK: {len(ids.get("rota", []))} tarefas da rota e {len(ids.get("conquistas", []))} conquistas verificadas'
          + (f' ({len(warnings)} aviso(s)).' if warnings else '.'))

if __name__ == '__main__':
    main()
