import io, base64, subprocess, os

SP = os.path.dirname(os.path.abspath(__file__))
LOGOS = '/Users/antonybootsma/sign-company/public/logos'


def datauri(path):
    return 'data:image/svg+xml;base64,' + base64.b64encode(io.open(path, 'rb').read()).decode()


css = io.open(SP + '/_css.html', encoding='utf-8').read()
cover = io.open(SP + '/_p1.html', encoding='utf-8').read()
rest = io.open(SP + '/brouwer-pages.html', encoding='utf-8').read()

# ── cover afstemmen op Brouwer Sign ──
verv = [
    # lead onder de kop
    ('Software voor signbedrijven. Eén doorlopende lijn, geen losse gereedschappen.',
     'Voor Brouwer Sign. Eén doorlopende lijn van aanvraag tot betaling, '
     'van kantoor tot in de bus.'),
    # chip 1
    ('<span class="k">Voor signbedrijven</span><span class="v">2 tot 35 gebruikers · '
     'belettering, gevelreclame, printwerk</span>',
     '<span class="k">Voor jullie twintig</span><span class="v">kantoor, studio, '
     'werkvoorbereiding en montage</span>'),
    # chip 2
    ('<span class="k">vanaf € 129 per maand ex btw</span><span class="v">tot 10 gebruikers, '
     'alle modules erin</span>',
     '<span class="k">€ 199 per maand ex btw</span><span class="v">tot 20 gebruikers, '
     'alle modules erin</span>'),
    # chip 3
    ('<span class="k">30 dagen gratis</span><span class="v">account in 5 minuten, '
     'maandelijks opzegbaar</span>',
     '<span class="k">Account staat klaar</span><span class="v">30 dagen gratis, '
     'maandelijks opzegbaar</span>'),
]
for oud, nieuw in verv:
    assert oud in cover, 'niet gevonden op de cover: ' + oud[:60]
    cover = cover.replace(oud, nieuw)

body = cover + rest
body = body.replace('{{LOGO_WIT}}', datauri(LOGOS + '/doen-logo-wit.svg'))
body = body.replace('{{LOGO_PETROL}}', datauri(LOGOS + '/doen-logo.svg'))
assert '{{LOGO' not in body

fonts = io.open(SP + '/fonts.css', encoding='utf-8').read()
head = ('<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
        '<title>doen. — voor Brouwer Sign</title>\n<style>\n')

# _css.html is een eigen <style>-blok uit de sibon-bron en komt ná de fonts.
# _p3.css hoort bij de projectpagina en komt uit de oudere signbedrijven-brochure.
p3css = io.open(SP + '/_p3.css', encoding='utf-8').read()
html = SP + '/doen-brouwersign.html'
io.open(html, 'w', encoding='utf-8').write(
    head + fonts + '</style>\n' + css
    + '\n<style>\n' + p3css + '\n</style>\n</head>\n<body>\n' + body)

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

for i in (1, 2, 3, 4):
    v = '%s/bs%d.html' % (SP, i)
    io.open(v, 'w', encoding='utf-8').write(
        io.open(html, encoding='utf-8').read()
        + '<style>body{margin:0}.page{display:none!important}'
          '.page:nth-of-type(%d){display:block!important}</style>' % i)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--window-size=1123,794',
                    '--hide-scrollbars', '--virtual-time-budget=4000',
                    '--screenshot=%s/bs-pg%d.png' % (SP, i), 'file://' + v],
                   capture_output=True)

pdf = SP + '/doen-brouwersign.pdf'
subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                '--print-to-pdf=' + pdf, 'file://' + html], capture_output=True)
print('pdf', os.path.getsize(pdf), 'bytes')
