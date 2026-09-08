#!/usr/bin/env python3
"""Bouwt doen-magazine.pdf uit pages.html + _css.html.

Formaat: 216 x 303 mm per pagina, dus A4 plus 3 mm afloop rondom. Twaalf
pagina's inclusief omslag, bedoeld voor geniet drukwerk. Pagina 6 en 7 vormen
daarbij het echte middenkatern en liggen in het gedrukte boekje naast elkaar
plat open; daarom staat de doorlopende route juist daar.

Fonts komen uit ../brochure/fonts.css: Hanken Grotesk, Instrument Sans en
Spline Sans Mono, allemaal base64 ingebed zodat het bestand op elke machine
hetzelfde rendert, ook bij de drukker.

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

BEELDEN = {
    'LOGO': 'public/logos/doen-logo.svg',
    'LOGO_WIT': 'public/logos/doen-logo-wit.svg',
    'FOTO_GEVEL': 'public/images/fotos/hoogwerker-aan-de-gevel-breed.webp',
    'FOTO_ANTONY': 'public/images/maker/antony-en-jos.webp',
    'FOTO_PRIJS': 'public/images/fotos/prijs-uitrekenen.webp',
    'FOTO_HOOGWERKER': 'public/images/fotos/boren-in-de-gevel.webp',
    'STAP_OFFERTES': 'docs/magazine/beeld/stap-offertes.jpg',
    'STAP_PLANNING': 'docs/magazine/beeld/stap-planning.jpg',
    'STAP_MAKEN': 'docs/magazine/beeld/stap-visualizer.jpg',
    'STAP_FACTUREN': 'docs/magazine/beeld/stap-facturen.jpg',
    'STAP_DAAN': 'docs/magazine/beeld/stap-daan.jpg',
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
    assert aantal == 12, 'verwacht 12 paginas, geteld: %d' % aantal

    html = (
        '<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
        '<title>doen. magazine</title>\n<style>\n' + fonts + '</style>\n'
        + css + '</head>\n<body>\n' + body + '\n</body>\n</html>\n'
    )
    doel = os.path.join(SP, 'doen-magazine.html')
    io.open(doel, 'w', encoding='utf-8').write(html)
    return doel, aantal


def pdf(html):
    uit = os.path.join(SP, 'doen-magazine.pdf')
    subprocess.run(
        [CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
         '--virtual-time-budget=8000', '--print-to-pdf=' + uit, 'file://' + html],
        capture_output=True,
    )
    return uit


def paginabeelden(html, aantal):
    """Losse PNG per pagina om na te kijken. 216 x 303 mm bij 96 dpi."""
    mapje = os.path.join(SP, 'proef')
    os.makedirs(mapje, exist_ok=True)
    basis = io.open(html, encoding='utf-8').read()
    for i in range(1, aantal + 1):
        v = os.path.join(SP, '_proef.html')
        io.open(v, 'w', encoding='utf-8').write(
            basis + '<style>body{margin:0}.page{display:none!important}'
            '.page:nth-of-type(%d){display:block!important}</style>' % i
        )
        subprocess.run(
            [CHROME, '--headless', '--disable-gpu', '--window-size=816,1145',
             '--hide-scrollbars', '--virtual-time-budget=5000',
             '--screenshot=%s/p%02d.png' % (mapje, i), 'file://' + v],
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
    print('proeven', m)
