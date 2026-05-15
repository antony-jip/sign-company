/**
 * Vervangt placeholders in `template` door waarden uit `vars`.
 *
 * Accepteert zowel `{{naam}}` (canoniek, zoals geseed in
 * email_templates) als `{naam}` (legacy hits in oude trigger-code).
 * Onbekende placeholders blijven onveranderd staan zodat ze in een
 * preview zichtbaar zijn en niet stilletjes leeg gerenderd worden.
 *
 * Geen HTML-escaping: caller blijft verantwoordelijk voor context
 * (mail-body via dedicated builder, plain-text rechtstreeks).
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}|\{(\w+)\}/g,
    (match, doubleKey: string | undefined, singleKey: string | undefined) => {
      const key = doubleKey ?? singleKey ?? "";
      const value = vars[key];
      return value !== undefined ? value : match;
    },
  );
}
