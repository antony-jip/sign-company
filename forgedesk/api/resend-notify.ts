import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface NotifyParams {
  to: string
  subject: string
  heading: string
  itemTitel?: string
  projectNaam?: string
  quote?: string
  ctaUrl?: string
  ctaLabel?: string
}

export async function sendDoenNotification(params: NotifyParams): Promise<boolean> {
  if (!resend) {
    console.warn('[resend-notify] RESEND_API_KEY not configured, skipping email')
    return false
  }

  try {
    await resend.emails.send({
      from: 'doen. <noreply@doen.team>',
      to: params.to,
      subject: params.subject,
      html: buildNotificationEmail(params),
    })
    console.log('[resend-notify] email sent to:', params.to, 'subject:', params.subject)
    return true
  } catch (err) {
    console.error('[resend-notify] failed:', err)
    return false
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildNotificationEmail(params: NotifyParams): string {
  const { heading, itemTitel, projectNaam, quote, ctaUrl, ctaLabel = 'Bekijk in doen. →' } = params

  const itemBlock = itemTitel ? `
    <tr><td style="padding: 0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #EBEBEB; border-radius: 8px;">
        <tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #1A1A1A;">
          ${escapeHtml(itemTitel)}
        </td></tr>
        ${projectNaam ? `<tr><td style="padding: 0 20px 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #6B6B66; line-height: 1.6;">
          Project: ${escapeHtml(projectNaam)}
        </td></tr>` : ''}
      </table>
    </td></tr>` : ''

  const quoteBlock = quote ? `
    <tr><td style="padding: 0 0 20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F5; border-radius: 8px; border-left: 4px solid #1A535C;">
        <tr><td style="padding: 16px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1A1A1A; font-style: italic; line-height: 1.6;">
          &ldquo;${escapeHtml(quote)}&rdquo;
        </td></tr>
      </table>
    </td></tr>` : ''

  const ctaBlock = ctaUrl ? `
    <tr><td style="padding: 8px 0 0 0;" align="center">
      <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: #1A535C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; line-height: 1;">
        ${escapeHtml(ctaLabel)}
      </a>
    </td></tr>` : ''

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">

        <!-- Logo -->
        <tr><td style="padding: 0 0 24px 0; text-align: center;">
          <span style="font-size: 24px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span>
        </td></tr>

        <!-- Card -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);">
            <tr><td style="padding: 36px 36px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 700; color: #1A1A1A; line-height: 1.3;">
                  ${escapeHtml(heading)}
                </td></tr>
                ${itemBlock}
                ${quoteBlock}
                ${ctaBlock}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding: 20px 0 0 0; text-align: center;">
          <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 16px;"></div>
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #9B9B95;">
            <span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> de kracht achter doeners.
          </span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
