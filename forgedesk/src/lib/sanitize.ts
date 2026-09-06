import DOMPurify from 'dompurify'

const EMAIL_TAGS = [
  'p', 'br', 'div', 'span', 'a', 'img',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
  'strong', 'em', 'b', 'i', 'u', 'blockquote', 'pre', 'code', 'hr',
]

const EMAIL_ATTR = [
  'href', 'src', 'alt', 'title', 'style',
  'width', 'height', 'border', 'cellpadding', 'cellspacing',
  'colspan', 'rowspan', 'align', 'valign', 'bgcolor', 'class',
]

const EMAIL_FORBID_TAGS = [
  'style', 'script', 'iframe', 'object', 'embed',
  'form', 'input', 'button', 'link', 'meta', 'base', 'svg',
]

const EMAIL_FORBID_ATTR = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
  'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup',
]

const AI_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'code', 'blockquote', 'table', 'tr', 'td', 'th', 'hr',
]

const AI_ATTR = ['href', 'title', 'class', 'target', 'rel']

const AI_FORBID_TAGS = [
  'style', 'script', 'iframe', 'object', 'embed',
  'form', 'input', 'button', 'img', 'svg', 'link', 'meta', 'base',
]

const AI_FORBID_ATTR = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
  'onfocus', 'onblur', 'onchange', 'onsubmit', 'style',
]

const EMAIL_URI_REGEXP = /^(?:(?:https?|mailto|tel|cid):|data:image\/(?:png|jpe?g|gif|webp|svg\+xml);)/i
const AI_URI_REGEXP = /^(?:https?|mailto|tel):/i

let hookRegistered = false
function ensureLinkHook() {
  if (hookRegistered) return
  hookRegistered = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && node instanceof HTMLAnchorElement) {
      const href = node.getAttribute('href') || ''
      const isExternal = /^https?:/i.test(href)
      if (isExternal) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
  })
}

export function sanitizeEmailHTML(html: string): string {
  if (!html) return ''
  ensureLinkHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: EMAIL_TAGS,
    ALLOWED_ATTR: EMAIL_ATTR,
    FORBID_TAGS: EMAIL_FORBID_TAGS,
    FORBID_ATTR: EMAIL_FORBID_ATTR,
    ALLOWED_URI_REGEXP: EMAIL_URI_REGEXP,
    ADD_ATTR: ['target'],
  })
}

// ============ IFRAME-WEERGAVE (mail-ombouw, reader golf 2) ============
//
// De nieuwe reader toont een mail in een iframe met srcdoc. Daar mag de
// eigen <style> van de mail blijven staan (nieuwsbrieven zien er anders uit
// als tekst op een hoop), maar zonder @import en zonder url() naar buiten,
// want dat zijn precies de trackingpixels die "afbeeldingen blokkeren"
// tegenhoudt. De stappen na DOMPurify zijn stringfuncties zodat ze ook
// zonder DOM te testen zijn.

export interface IframeOpties {
  afbeeldingenLaden: boolean
  /** Donkere weergave van de app; de iframe volgt niet vanzelf het thema van de ouder. */
  donker?: boolean
}

const IFRAME_TAGS = [
  ...EMAIL_TAGS,
  'center', 'font', 'small', 'big', 'sub', 'sup', 's', 'strike', 'del', 'ins',
  'caption', 'col', 'colgroup', 'dl', 'dt', 'dd', 'abbr', 'cite', 'q', 'address',
  'section', 'article', 'header', 'footer', 'main', 'figure', 'figcaption', 'label',
]

const IFRAME_ATTR = [
  ...EMAIL_ATTR,
  'background', 'dir', 'lang', 'srcset', 'id', 'name', 'face', 'color', 'size', 'nowrap',
]

const EXTERNE_URL = /^(?:https?:)?\/\//i
const VEILIGE_BRON = /^(?:cid:|data:image\/)/i

/** Verwijdert @import, gedrag-hacks en url() naar buiten (tenzij afbeeldingen aan). cid en data blijven. */
export function saniteerCss(css: string, opties: IframeOpties): string {
  let uit = css.replace(/\/\*[\s\S]*?\*\//g, '')
  uit = uit.replace(/@import\b[^;]*;?/gi, '')
  uit = uit.replace(/@charset\b[^;]*;?/gi, '')
  uit = uit.replace(/expression\s*\(/gi, 'geblokkeerd(')
  uit = uit.replace(/(?:behavior|-moz-binding)\s*:[^;}]*/gi, '')
  uit = uit.replace(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi, (heel: string, _q: string, waarde: string) => {
    const w = waarde.trim()
    if (VEILIGE_BRON.test(w)) return heel
    if (EXTERNE_URL.test(w) && opties.afbeeldingenLaden) return heel
    return 'none'
  })
  return uit
}

/** Externe img-bronnen en background-attributen naar data-* zodat niets laadt vóór de gebruiker het wil. */
export function herschrijfExterneAfbeeldingen(html: string, opties: IframeOpties): string {
  if (opties.afbeeldingenLaden) return html
  let uit = html.replace(/<img\b[^>]*>/gi, (tag) =>
    tag.replace(/\s(src|srcset)\s*=\s*("|')?((?:https?:)?\/\/)/gi, (_m, naam: string, q: string | undefined, pre: string) => ` data-${naam}=${q || ''}${pre}`),
  )
  uit = uit.replace(/\sbackground\s*=\s*("|')?((?:https?:)?\/\/)/gi, (_m, q: string | undefined, pre: string) => ` data-background=${q || ''}${pre}`)
  return uit
}

function saniteerInlineStijlen(html: string, opties: IframeOpties): string {
  return html
    .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (_m, css: string) => ` style="${saniteerCss(css, opties)}"`)
    .replace(/\sstyle\s*=\s*'([^']*)'/gi, (_m, css: string) => ` style='${saniteerCss(css, opties)}'`)
}

/** Elke link opent buiten de iframe, zonder opener. */
export function forceerLinksNieuwTab(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_m, attrs: string) => {
    const zonder = attrs.replace(/\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    return `<a${zonder} target="_blank" rel="noopener noreferrer">`
  })
}

const BASIS_STIJL = `
:root { color-scheme: light dark; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px; line-height: 1.5; color: #1a1a1a; background: #ffffff;
  overflow-wrap: anywhere; word-wrap: break-word; padding: 4px 2px;
}
img { max-width: 100%; height: auto; }
img[data-src] { min-width: 1px; min-height: 1px; }
pre { white-space: pre-wrap; }
table { max-width: 100%; }
blockquote { margin: 0 0 0 .8em; padding-left: .8em; border-left: 2px solid #c8c8c8; }
a { color: #1A535C; }
html.donker { color-scheme: dark; }
html.donker body { background: #1c1c1e !important; color: #e6e6e6 !important; }
html.donker a { color: #8fd0d8 !important; }
html.donker blockquote { border-left-color: #4a4a4c; }
html.donker body, html.donker table, html.donker td, html.donker th, html.donker div, html.donker p,
html.donker span, html.donker li, html.donker font, html.donker center, html.donker section {
  background-color: transparent !important; color: #e6e6e6 !important;
}
html.donker [bgcolor] { background-color: transparent !important; }
`.trim()

// Meldt de hoogte aan de ouder en laadt afbeeldingen op verzoek. Klikken op
// links gaat vanzelf naar de ouder door target=_blank.
const HOOGTE_SCRIPT = `
(function () {
  var laatste = -1;
  function meld() {
    var h = document.documentElement.scrollHeight;
    if (h === laatste) return;
    laatste = h;
    parent.postMessage({ type: 'doen-mail-hoogte', hoogte: h }, '*');
  }
  function laadAfbeeldingen() {
    var els = document.querySelectorAll('[data-src],[data-srcset],[data-background]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-src')) { el.setAttribute('src', el.getAttribute('data-src')); el.removeAttribute('data-src'); }
      if (el.hasAttribute('data-srcset')) { el.setAttribute('srcset', el.getAttribute('data-srcset')); el.removeAttribute('data-srcset'); }
      if (el.hasAttribute('data-background')) { el.setAttribute('background', el.getAttribute('data-background')); el.removeAttribute('data-background'); }
      el.addEventListener('load', meld);
    }
    meld();
  }
  window.addEventListener('load', meld);
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'doen-mail-afbeeldingen') laadAfbeeldingen();
    if (e.data && e.data.type === 'doen-mail-hoogte-vraag') { laatste = -1; meld(); }
  });
  if ('ResizeObserver' in window) new ResizeObserver(meld).observe(document.documentElement);
  for (var j = 0; j < document.images.length; j++) document.images[j].addEventListener('load', meld);
  meld();
})();
`.trim()

export function bouwIframeDocument(bodyHtml: string, css: string, opties: IframeOpties): string {
  return [
    '<!doctype html>',
    `<html${opties.donker ? ' class="donker"' : ''}>`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<style>${BASIS_STIJL}</style>`,
    css ? `<style>${css}</style>` : '',
    '</head><body>',
    bodyHtml,
    `<script>${HOOGTE_SCRIPT}</script>`,
    '</body></html>',
  ].join('')
}

const STYLE_BLOK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi

/**
 * Volledig html-document voor `iframe srcdoc`. Zelfde allowlist als de oude
 * reader, plus de eigen <style> van de mail (gesaneerd), plus een basis-
 * stylesheet, plus het hoogte-script. Externe afbeeldingen alleen als de
 * gebruiker dat wil.
 */
export function saniteerVoorIframe(html: string, opties: IframeOpties): string {
  if (!html) return bouwIframeDocument('', '', opties)
  ensureLinkHook()
  const stijlen: string[] = []
  const zonderStyle = html.replace(STYLE_BLOK, (_m, css: string) => { stijlen.push(css); return '' })
  const css = saniteerCss(stijlen.join('\n'), opties)
  const schoon = DOMPurify.sanitize(zonderStyle, {
    ALLOWED_TAGS: IFRAME_TAGS,
    ALLOWED_ATTR: IFRAME_ATTR,
    FORBID_TAGS: EMAIL_FORBID_TAGS,
    FORBID_ATTR: EMAIL_FORBID_ATTR,
    ALLOWED_URI_REGEXP: EMAIL_URI_REGEXP,
    ADD_ATTR: ['target'],
  })
  const body = forceerLinksNieuwTab(saniteerInlineStijlen(herschrijfExterneAfbeeldingen(schoon, opties), opties))
  return bouwIframeDocument(body, css, opties)
}
