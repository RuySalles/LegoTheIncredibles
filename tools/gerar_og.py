#!/usr/bin/env python3
"""Gera a imagem de compartilhamento (WhatsApp, Discord...) a partir de assets/tema/og.html (parte do tema).

Uso:
    python tools/gerar_og.py

O que faz:
1. sobe um servidor local temporário e tira um print 1200×630 com o Chrome ou o Edge (modo headless);
2. converte para JPG (qualidade 85) com um NOME NOVO (og-image-2.jpg, og-image-3.jpg...),
   porque o WhatsApp guarda a imagem antiga em cache pelo nome;
3. troca og:image/twitter:image nas páginas e apaga a imagem anterior.

A conversão para JPG usa o Pillow (pip install pillow) ou, no Windows, o próprio sistema (PowerShell).
"""
import functools, http.server, re, shutil, socketserver, subprocess, sys, threading
from pathlib import Path

for s in (sys.stdout, sys.stderr):
    if hasattr(s, 'reconfigure'): s.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parent.parent
PAGES = [p for p in (ROOT / 'index.html', ROOT / 'rota.html') if p.is_file()]
CANDIDATES = [
    shutil.which('chrome'), shutil.which('google-chrome'), shutil.which('chromium'), shutil.which('msedge'),
    r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def browser():
    for c in CANDIDATES:
        if c and Path(c).is_file(): return c
    sys.exit('Não achei Chrome nem Edge. Instale um deles ou gere o print à mão (veja o README).')

def to_jpg(png, jpg):
    """PNG → JPG qualidade 85: Pillow se houver; senão, System.Drawing do Windows."""
    try:
        from PIL import Image
        Image.open(png).convert('RGB').save(jpg, 'JPEG', quality=85, optimize=True, progressive=True)
        return True
    except ImportError:
        pass
    if sys.platform == 'win32':
        ps = ("Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile($args[0]); "
              "$c=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}; "
              "$p=New-Object System.Drawing.Imaging.EncoderParameters 1; "
              "$p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]85); "
              "$i.Save($args[1],$c,$p); $i.Dispose()")
        r = subprocess.run(['powershell', '-NoProfile', '-Command', f'& {{{ps}}}', str(png), str(jpg)], capture_output=True)
        return r.returncode == 0 and jpg.is_file()
    return False

def main():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    with socketserver.TCPServer(('127.0.0.1', 0), handler) as srv:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        url = f'http://127.0.0.1:{srv.server_address[1]}/assets/tema/og.html'
        png = ROOT / 'og.png'
        subprocess.run([browser(), '--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630',
                        '--virtual-time-budget=8000', f'--screenshot={png}', url], check=True, capture_output=True)
        srv.shutdown()
    old = sorted(ROOT.glob('og-image-*.jpg'), key=lambda p: int(re.search(r'(\d+)', p.stem).group(1)))
    n = int(re.search(r'(\d+)', old[-1].stem).group(1)) + 1 if old else 1
    new = ROOT / f'og-image-{n}.jpg'
    if not to_jpg(png, new):
        sys.exit(f'Print salvo em {png.name}. Instale o Pillow (pip install pillow) e rode de novo, '
                 f'ou converta para JPG (qualidade ~85) com o nome {new.name} e troque og:image nas páginas.')
    png.unlink()
    size = new.stat().st_size // 1024
    for page in PAGES:
        html = page.read_text(encoding='utf-8')
        page.write_text(re.sub(r'og-image-\d+\.jpg', new.name, html), encoding='utf-8', newline='\n')
    for p in old:
        if p != new: p.unlink()
    print(f'{new.name} gerada ({size} KB) e páginas atualizadas.' + (' ATENÇÃO: acima de 300 KB o WhatsApp pode ignorar.' if size > 300 else ''))

if __name__ == '__main__':
    main()
