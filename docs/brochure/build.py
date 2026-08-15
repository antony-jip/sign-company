import io, base64, subprocess, os

import os
SP = os.path.dirname(os.path.abspath(__file__))
DEST = SP
LOGOS = '/Users/antonybootsma/sign-company/public/logos'


def datauri(path):
    return 'data:image/svg+xml;base64,' + base64.b64encode(io.open(path, 'rb').read()).decode()


body = io.open(SP + '/sibon-body.html', encoding='utf-8').read()
body = body.replace('{{LOGO_WIT}}', datauri(LOGOS + '/doen-logo-wit.svg'))
body = body.replace('{{LOGO_PETROL}}', datauri(LOGOS + '/doen-logo.svg'))
assert '{{LOGO' not in body

fonts = io.open(SP + '/fonts.css', encoding='utf-8').read()
head = ('<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n'
        '<title>doen. — introductie voor signbedrijven</title>\n<style>\n')

html = DEST + '/doen-introductie-sibon.html'
io.open(html, 'w', encoding='utf-8').write(head + fonts + '</style>\n' + body)

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# losse paginascreenshots om na te kijken
for i in (1, 2, 3):
    v = '%s/v%d.html' % (SP, i)
    io.open(v, 'w', encoding='utf-8').write(
        io.open(html, encoding='utf-8').read()
        + '<style>body{margin:0}.page{display:none!important}'
          '.page:nth-of-type(%d){display:block!important}</style>' % i)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--window-size=1123,794',
                    '--hide-scrollbars', '--virtual-time-budget=4000',
                    '--screenshot=%s/pg%d.png' % (SP, i), 'file://' + v],
                   capture_output=True)

pdf = DEST + '/doen-introductie-sibon.pdf'
subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-pdf-header-footer',
                '--print-to-pdf=' + pdf, 'file://' + html], capture_output=True)
print('pdf', os.path.getsize(pdf), 'bytes')
