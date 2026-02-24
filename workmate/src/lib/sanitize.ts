/**
 * Basic HTML sanitizer — strips dangerous elements and attributes
 * from untrusted HTML (e.g. email content) to prevent XSS attacks.
 *
 * Uses the browser's built-in DOMParser for robust parsing.
 */

const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'form', 'link',
  'meta', 'base', 'applet', 'math', 'svg',
]

const DANGEROUS_ATTR_PREFIXES = ['on'] // onclick, onerror, onload, etc.

const DANGEROUS_URL_SCHEMES = ['javascript:', 'data:text/html', 'vbscript:']

const URL_ATTRS = ['href', 'src', 'action', 'xlink:href', 'formaction', 'poster']

export function sanitizeHtml(html: string): string {
  if (!html) return ''

  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Remove dangerous elements and their children
  DANGEROUS_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  })

  // Clean all remaining elements
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()

      // Remove event handlers (onclick, onerror, etc.)
      if (DANGEROUS_ATTR_PREFIXES.some((prefix) => name.startsWith(prefix))) {
        el.removeAttribute(attr.name)
        continue
      }

      // Remove dangerous URL schemes
      if (URL_ATTRS.includes(name)) {
        const value = attr.value.replace(/\s/g, '').toLowerCase()
        if (DANGEROUS_URL_SCHEMES.some((scheme) => value.startsWith(scheme))) {
          el.removeAttribute(attr.name)
          continue
        }
      }

      // Remove style attributes containing expression() or url() (IE XSS vectors)
      if (name === 'style') {
        const value = attr.value.toLowerCase()
        if (/expression\s*\(|url\s*\(/i.test(value)) {
          el.removeAttribute(attr.name)
        }
      }
    }
  })

  return doc.body.innerHTML
}
