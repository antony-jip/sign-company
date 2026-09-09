#!/usr/bin/env python3
"""Bouwt de staande versie van het doen.-magazine: 1080 x 1920 px per pagina.

Bedoeld om te delen in de SIBON-app, na het interview bij Sign+. Elf pagina's,
dezelfde inhoud en hetzelfde palet als het gedrukte magazine, maar per pagina
teruggebracht tot één gedachte en op een typetrap die op een telefoon leesbaar
is.

Levert twee dingen op:
  story/beeld/s01.png t/m s11.png  losse pagina's, om te posten
  doen-story.pdf                   dezelfde elf pagina's als één bestand

Fonts komen uit ../brochure/fonts.css: Hanken Grotesk, Instrument Sans en
Spline Sans Mono, base64 ingebed zodat het overal hetzelfde rendert.
Beelden gaan als data-URI mee, anders laadt Chrome ze niet in --headless.
"""

import base64
import io
import mimetypes
import os
import subprocess

SP = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SP, '..', '..'))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
BREED, HOOG = 1080, 1920

BEELDEN = {
    'LOGO': 'public/logos/doen-logo.svg',
    'LOGO_WIT': 'public/logos/doen-logo-wit.svg',
    'FOTO_GEVEL': 'public/images/fotos/hoogwerker-aan-de-gevel.webp',
    'FOTO_HOOGWERKER': 'public/images/fotos/boren-in-de-gevel.webp',
    'FOTO_BUS': 'public/images/fotos/folie-op-de-bus.webp',
    'FOTO_KIJKEN': 'public/images/fotos/kijken-of-het-staat.webp',
}


def datauri(pad):
    vol = os.path.join(ROOT, pad)
    soort = mimetypes.guess_type(vol)[0] or 'application/octet-stream'
    if vol.endswith('.svg'):
        soort = 'image/svg+xml'
    with open(vol, 'rb') as f:
        return 'data:%s;base64,%s' % (soort, base64.b64encode(f.read()).decode())


def bouw():
    css = io.open(os.path.join(SP, '_css.html'), encoding='utf-8').read()
    body = io.open(os.path.join(SP, 'pages.html'), encoding='utf-8').read()
    fonts = io.open(os.path.join(SP, '..', 'brochure', 'fonts.css'), encoding='utf-8').read()

    for sleutel, pad in BEELDEN.items():
        merk = '{{%s}}' % sleutel
        assert merk in body, 'niet gebruikt in pages.html: ' + merk
        body = body.replace(merk, datauri(pad))
    assert '{{' not in body, 'er staat nog een onvervangen placeholder in pages.html'

    aantal = body.count('<div class="page')
    assert aantal == 7, 'verwacht 7 paginas, geteld: %d' % aantal

    html = (
        '<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
        '<title>doen. story</title>\n<style>\n' + fonts + '</style>\n'
        + css + '</head>\n<body>\n' + body + '\n</body>\n</html>\n'
    )
    doel = os.path.join(SP, 'doen-story.html')
    io.open(doel, 'w', encoding='utf-8').write(html)
    return doel, aantal


def pdf(html):
    uit = os.path.join(SP, 'doen-story.pdf')
    subprocess.run(
        [CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
         '--virtual-time-budget=8000', '--print-to-pdf=' + uit, 'file://' + html],
        capture_output=True,
    )
    return uit


def paginabeelden(html, aantal):
    """Eén PNG per pagina, precies 1080 x 1920 px."""
    mapje = os.path.join(SP, 'beeld')
    os.makedirs(mapje, exist_ok=True)
    basis = io.open(html, encoding='utf-8').read()
    for i in range(1, aantal + 1):
        v = os.path.join(SP, '_proef.html')
        io.open(v, 'w', encoding='utf-8').write(
            basis + '<style>body{margin:0}.page{display:none!important}'
            '.page:nth-of-type(%d){display:block!important}</style>' % i
        )
        subprocess.run(
            [CHROME, '--headless', '--disable-gpu',
             '--window-size=%d,%d' % (BREED, HOOG),
             '--hide-scrollbars', '--virtual-time-budget=5000',
             '--screenshot=%s/s%02d.png' % (mapje, i), 'file://' + v],
            capture_output=True,
        )
    os.path.exists(os.path.join(SP, '_proef.html')) and os.remove(os.path.join(SP, '_proef.html'))
    return mapje


if __name__ == '__main__':
    html, aantal = bouw()
    print('html   ', os.path.getsize(html), 'bytes ·', aantal, 'paginas')
    p = pdf(html)
    print('pdf    ', os.path.getsize(p), 'bytes ·', p)
    m = paginabeelden(html, aantal)
    print('beeld  ', m)
