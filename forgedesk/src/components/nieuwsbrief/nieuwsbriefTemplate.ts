// E-mail-veilige basistemplate (content-niveau): tabellen + inline styles,
// geen externe afbeeldingen. Dit wordt door de server-mailshell
// (api/nieuwsbrief-verzend.ts) in de witte kaart + afmeldlink gewikkeld,
// dus geen eigen <html>/<body> hier. Kleuren volgen de Sign Company-huisstijl.
export const NIEUWSBRIEF_BASIS_TEMPLATE = `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr><td style="padding-bottom:22px;border-bottom:1px solid #EBEBEB;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#1A1A1A;">Sign Company</span><span style="font-size:20px;font-weight:800;color:#F15025;">.</span>
  </td></tr>
</table>

<h1 style="margin:28px 0 0;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#1A1A1A;">
  Een pakkende kop voor je nieuwsbrief
</h1>

<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#57574F;">
  Beste relatie,<br><br>
  Schrijf hier je openingsalinea. Vertel kort waar deze nieuwsbrief over gaat en waarom het de moeite waard is om verder te lezen.
</p>

<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:#57574F;">
  Voeg hier meer tekst toe. Je kunt <a href="https://signcompany.nl" style="color:#1A535C;text-decoration:underline;">links</a> en <strong style="color:#1A1A1A;">accenten</strong> gebruiken, of een opsomming:
</p>

<ul style="margin:12px 0 0;padding-left:20px;font-size:15px;line-height:1.7;color:#57574F;">
  <li>Eerste punt dat je wilt benoemen</li>
  <li>Tweede punt</li>
  <li>Derde punt</li>
</ul>

<table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 0;">
  <tr><td style="border-radius:8px;background:#F15025;">
    <a href="https://signcompany.nl" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Bekijk meer</a>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:32px 0 0;">
  <tr><td style="border-top:1px solid #EBEBEB;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>

<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#57574F;">
  Met vriendelijke groet,<br>
  <strong style="color:#1A1A1A;">Antony · Sign Company</strong>
</p>`
