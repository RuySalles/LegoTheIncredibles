#!/usr/bin/env python3
"""Importa as conquistas da Steam para data/conquistas.json e baixa os ícones.

Uso:
    python tools/steam_importar.py                 # usa o steamAppId de data/conquistas.json
    python tools/steam_importar.py --appid 285160  # outro jogo
    python tools/steam_importar.py --icones        # baixa de novo os ícones que já existem
    python tools/steam_importar.py --check         # só mostra o que faria

Pode rodar quantas vezes quiser: mantém tudo que foi escrito à mão (dicas, capítulos,
perdíveis, fontes...) e só atualiza nome, descrição, % e "hidden". Conquistas novas entram
no capítulo "a-organizar", com a dica vazia (o validador acusa até alguém escrever).

Não precisa de chave da Steam: lê a página pública de estatísticas em português
(nomes e descrições oficiais em PT-BR) e a API pública de porcentagens.
Só usa a biblioteca padrão do Python.
"""
import json, re, sys, urllib.request
from datetime import date
from html import unescape
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'): _s.reconfigure(encoding='utf-8')  # acentos no console do Windows
ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / 'data' / 'conquistas.json'
ICONS = ROOT / 'assets' / 'achievements'
PAGE = 'https://steamcommunity.com/stats/{appid}/achievements/?l=brazilian'
API = 'https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid={appid}'
UA = {'User-Agent': 'guia-conquistas-importer', 'Cookie': 'Steam_Language=brazilian'}
INBOX = {'id': 'a-organizar', 'title': 'A organizar', 'subtitle': 'Importadas da Steam: distribua nos capítulos certos e apague este', 'achievements': []}

def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')

def walk(node):
    """Percorre o JSON da página procurando a lista de conquistas e o mapa de porcentagens."""
    if isinstance(node, dict):
        yield node
        for v in node.values(): yield from walk(v)
    elif isinstance(node, list):
        for v in node: yield from walk(v)
    elif isinstance(node, str) and node[:1] in '{[':
        try: yield from walk(json.loads(node))
        except ValueError: pass

def read_page(appid):
    html = get(PAGE.format(appid=appid))
    m = re.search(r'<script[^>]*id="valve-ssr-data"[^>]*>(.*?)</script>', html, re.S)
    if not m: sys.exit(f'Não achei conquistas na página da Steam do app {appid}. Confira o App ID na URL da loja '
                       f'(store.steampowered.com/app/<ID>/); se estiver certo, o formato da página mudou e este script precisa de ajuste.')
    ssr = json.loads(m.group(1))
    achs, pcts = None, {}
    for d in walk(ssr):
        if achs is None and isinstance(d.get('achievements'), list) and d['achievements'] and isinstance(d['achievements'][0], dict) and 'api_name' in d['achievements'][0]:
            achs = d['achievements']
        if isinstance(d.get('percentages'), dict): pcts = d['percentages']
    if not achs: sys.exit(f'A página da Steam não trouxe conquistas para o app {appid}. O id está certo? O jogo tem conquistas?')
    return achs, pcts

def main():
    data = json.loads(FILE.read_text(encoding='utf-8'))
    appid = int(sys.argv[sys.argv.index('--appid') + 1]) if '--appid' in sys.argv else int(data.get('steamAppId') or 0)
    if not appid: sys.exit('Informe o App ID: python tools/steam_importar.py --appid 123456')
    achs, page_pct = read_page(appid)
    try:
        api = json.loads(get(API.format(appid=appid)))['achievementpercentages']['achievements']
        api_pct = {a['name']: round(float(a['percent']), 1) for a in api}
    except Exception as e:
        print(f'AVISO: API de porcentagens falhou ({e}); usando as % da página.')
        api_pct = {}

    current = data.get('achievements', {})
    out, added, changed = {}, [], []
    for a in achs:
        aid = a['api_name']
        if a.get('archived'):
            print(f'AVISO: {aid} está arquivada na Steam (não dá mais para conseguir); ignorada.')
            continue
        pct = api_pct.get(aid, round(float(page_pct.get(str(a.get('internal_key')), 0)), 1))
        steam = {'name': unescape(a.get('name', '')).strip(), 'desc': unescape(a.get('description', '')).strip(), 'pct': pct}
        old = current.get(aid)
        if old is None:
            entry = {**steam, 'tip': ''}
            added.append(aid)
        else:
            entry = dict(old)
            for k, v in steam.items():
                if entry.get(k) != v: changed.append(f'{aid}.{k}'); entry[k] = v
        if a.get('hidden'): entry['hidden'] = True
        else: entry.pop('hidden', None)
        out[aid] = entry
        icon = ICONS / f'{aid.lower()}.jpg'
        if a.get('icon_achieved') and ('--check' not in sys.argv) and (not icon.exists() or '--icones' in sys.argv):
            ICONS.mkdir(parents=True, exist_ok=True)
            icon.write_bytes(get(a['icon_achieved'], binary=True))
    gone = sorted(set(current) - set(out))
    for aid in gone:
        print(f'AVISO: {aid} está no guia mas não veio da Steam; mantida (veja se foi renomeada ou arquivada).')
        out[aid] = current[aid]

    print(f'App {appid}: {len(out)} conquistas · {len(added)} nova(s) · {len(changed)} campo(s) atualizado(s).')
    if '--check' in sys.argv: return
    data['steamAppId'] = appid
    data['achievements'] = out
    data['updated'] = date.today().isoformat()
    if added:
        chapters = data.setdefault('chapters', [])
        inbox = next((c for c in chapters if c.get('id') == INBOX['id']), None)
        if not inbox: inbox = dict(INBOX, achievements=[]); chapters.append(inbox)
        inbox['achievements'] += added
    FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Gravado em {FILE.relative_to(ROOT)}. Ícones em {ICONS.relative_to(ROOT)}/.')

if __name__ == '__main__':
    main()
