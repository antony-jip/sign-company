import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ongeldig emailadres' }, { status: 400 })
    }

    // Opslaan in Supabase
    const { error: dbError } = await supabase
      .from('wachtlijst')
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: 'email' })

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
    }

    // Confirmatie-email versturen (als Resend is geconfigureerd)
    if (resend) {
      try {
        await resend.emails.send({
          from: 'doen. <hello@doen.team>',
          to: email.toLowerCase().trim(),
          subject: 'Je staat op de lijst. Goed bezig.',
          html: getConfirmationEmail(),
        })
      } catch (emailError) {
        // Email faalt maar signup is wel opgeslagen
        console.error('Email error:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Er ging iets mis' }, { status: 500 })
  }
}

function getConfirmationEmail(): string {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welkom bij doen.</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F4F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F5F4F1; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1A535C; padding: 40px 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">doen</span><span style="font-size: 24px; font-weight: 800; color: #F15025;">.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">
                      Je staat op de lijst<span style="color: #F15025;">.</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <span style="font-size: 15px; color: rgba(255,255,255,0.5); line-height: 1.5;">
                      Goed bezig. We melden ons zodra doen. live gaat.
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="font-size: 15px; color: #1A1A1A; line-height: 1.7; margin: 0 0 20px 0;">
                Bedankt voor je aanmelding. Je bent een van de eersten die doen. gaat gebruiken.
              </p>
              <p style="font-size: 15px; color: #6B6B66; line-height: 1.7; margin: 0 0 24px 0;">
                doen. is het alles-in-een platform voor sign- en reclamebedrijven. Van offerte tot factuur, van planning tot klantportaal. Gebouwd door signmakers, voor signmakers.
              </p>

              <!-- What's included -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F7F5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="font-size: 12px; font-weight: 700; color: #9B9B95; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 16px 0;">
                      WAT JE KRIJGT
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${['Projecten & cockpit', 'Offertes met calculator', 'Klantportaal', 'Montageplanning', 'Werkbonnen', 'Facturatie met Mollie', 'AI Visualizer', 'AI-assistent Daan'].map(item => `
                      <tr>
                        <td style="padding: 6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 20px; vertical-align: top; padding-top: 2px;">
                                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #1A535C;"></span>
                              </td>
                              <td style="font-size: 14px; color: #1A1A1A;">${item}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      `).join('')}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size: 15px; color: #6B6B66; line-height: 1.7; margin: 0 0 8px 0;">
                De eerste 30 dagen zijn gratis. Geen creditcard nodig.
              </p>
              <p style="font-size: 15px; color: #6B6B66; line-height: 1.7; margin: 0;">
                Vragen? Mail ons op <a href="mailto:hello@doen.team" style="color: #1A535C; text-decoration: none; font-weight: 600;">hello@doen.team</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <!-- Spectrum bar -->
              <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #1A535C, #F15025); margin-bottom: 20px;"></div>
              <p style="font-size: 12px; color: #9B9B95; margin: 0;">
                <span style="font-weight: 700;">doen</span><span style="color: #F15025; font-weight: 700;">.</span> de kracht achter doeners.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
