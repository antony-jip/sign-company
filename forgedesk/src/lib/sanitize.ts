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

export function sanitizeAIResponse(html: string): string {
  if (!html) return ''
  ensureLinkHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: AI_TAGS,
    ALLOWED_ATTR: AI_ATTR,
    FORBID_TAGS: AI_FORBID_TAGS,
    FORBID_ATTR: AI_FORBID_ATTR,
    ALLOWED_URI_REGEXP: AI_URI_REGEXP,
  })
}
