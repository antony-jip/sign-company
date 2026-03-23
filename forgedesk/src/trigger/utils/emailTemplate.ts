/**
 * Email template builder for Trigger.dev tasks.
 * Mirrors api/emailTemplate.ts but available server-side in tasks.
 * White-label: no "Doen." or "FORGEdesk" visible to clients.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function replaceTemplateVariables(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

interface PortalEmailParams {
  heading: string;
  itemTitel?: string;
  beschrijving?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  bedrijfsnaam?: string;
  quote?: string;
  logoUrl?: string;
  primaireKleur?: string;
}

export function buildPortalEmailHtml(params: PortalEmailParams): string {
  const {
    heading,
    itemTitel,
    beschrijving,
    ctaLabel = "Bekijk in portaal \u2192",
    ctaUrl,
    bedrijfsnaam,
    quote,
    logoUrl,
    primaireKleur,
  } = params;

  const accent = primaireKleur || "#5A8264";
  const accentLight = primaireKleur ? `${primaireKleur}18` : "#E4EBE6";
  const bgOuter = "#F4F3F0";
  const bgCard = "#FFFFFF";
  const textDark = "#1A1A1A";
  const textMuted = "#5A5A55";
  const textLight = "#8A8A85";
  const borderLight = "#E8E8E3";

  const itemBlock = itemTitel
    ? `<tr><td style="padding:0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${borderLight};border-radius:8px;"><tr><td style="padding:16px 20px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:${textDark};">${escapeHtml(itemTitel)}</td></tr>${beschrijving ? `<tr><td style="padding:0 20px 16px 20px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${textMuted};line-height:1.6;">${escapeHtml(beschrijving)}</td></tr>` : ""}</table></td></tr>`
    : "";

  const quoteBlock = quote
    ? `<tr><td style="padding:0 0 20px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background-color:${accentLight};border-radius:8px;border-left:4px solid ${accent};"><tr><td style="padding:16px 20px;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${textDark};font-style:italic;line-height:1.6;">&ldquo;${escapeHtml(quote)}&rdquo;</td></tr></table></td></tr>`
    : "";

  const ctaBlock = ctaUrl
    ? `<tr><td style="padding:8px 0 0 0;" align="center"><a href="${escapeHtml(ctaUrl)}" target="_blank" style="display:inline-block;background-color:${accent};color:#FFFFFF;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;line-height:1;">${escapeHtml(ctaLabel)}</a></td></tr>`
    : "";

  const groetBlock = bedrijfsnaam
    ? `<tr><td style="padding:16px 0 0 0;font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${textMuted};line-height:1.8;">Met vriendelijke groet,<br/><strong style="color:${textDark};">${escapeHtml(bedrijfsnaam)}</strong></td></tr>`
    : "";

  const footerText = bedrijfsnaam ? `Verzonden namens ${escapeHtml(bedrijfsnaam)}` : "";

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(bedrijfsnaam || "")}" style="max-height:48px;max-width:200px;object-fit:contain;" />`
    : bedrijfsnaam
    ? `<span style="font-family:'DM Sans',Arial,sans-serif;font-size:22px;color:${textDark};letter-spacing:-0.5px;"><strong>${escapeHtml(bedrijfsnaam)}</strong></span>`
    : "";

  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:${bgOuter};-webkit-font-smoothing:antialiased;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bgOuter};padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td style="padding:0 0 24px 0;text-align:center;">${logoHtml}</td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:${bgCard};border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.04);"><tr><td style="padding:40px 40px 36px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 24px 0;font-family:'DM Sans',Arial,sans-serif;font-size:20px;font-weight:700;color:${textDark};line-height:1.3;">${escapeHtml(heading)}</td></tr>${itemBlock}${quoteBlock}${groetBlock}${ctaBlock}</table></td></tr></table><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td style="padding:24px 0 0 0;text-align:center;font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${textLight};line-height:1.6;">${footerText}</td></tr></table></td></tr></table></body></html>`;
}
