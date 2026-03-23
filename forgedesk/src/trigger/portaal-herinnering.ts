import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { buildPortalEmailHtml, replaceTemplateVariables } from "./utils/emailTemplate";

/**
 * Scheduled task: checks all users' active portalen for unanswered items
 * and sends reminder emails to clients.
 *
 * Runs daily at 09:00 CET. One reminder per item, ever.
 * Controlled by portaal_instellingen.herinnering_na_dagen (0 = disabled).
 */
export const portaalHerinneringCron = schedules.task({
  id: "portaal-herinnering-cron",
  cron: { pattern: "0 9 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    logger.info("Portaal herinnering cron gestart", {
      scheduledAt: payload.timestamp,
    });

    metadata.set("status", "scanning");

    // Get all users with active portaal_instellingen
    const { data: allSettings } = await supabase
      .from("app_settings")
      .select("user_id, portaal_instellingen");

    if (!allSettings || allSettings.length === 0) {
      logger.info("Geen gebruikers met portaal instellingen");
      return { verstuurd: 0, overgeslagen: 0, errors: [] };
    }

    let totaalVerstuurd = 0;
    let totaalOvergeslagen = 0;
    const errors: string[] = [];

    for (const settings of allSettings) {
      const instellingen = (settings.portaal_instellingen || {}) as {
        herinnering_na_dagen?: number;
        bedrijfslogo_op_portaal?: boolean;
        template_herinnering?: { onderwerp?: string; inhoud?: string };
      };

      const herinneringDagen = instellingen.herinnering_na_dagen ?? 3;
      if (herinneringDagen === 0) {
        totaalOvergeslagen++;
        continue;
      }

      const result = await processUserHerinneringen({
        userId: settings.user_id,
        herinneringDagen,
        template: instellingen.template_herinnering,
        showLogo: instellingen.bedrijfslogo_op_portaal !== false,
      });

      totaalVerstuurd += result.verstuurd;
      totaalOvergeslagen += result.overgeslagen;
      errors.push(...result.errors);
    }

    metadata.set("status", "completed");
    metadata.set("verstuurd", totaalVerstuurd);
    metadata.set("overgeslagen", totaalOvergeslagen);

    logger.info("Portaal herinnering cron afgerond", {
      verstuurd: totaalVerstuurd,
      overgeslagen: totaalOvergeslagen,
      errors: errors.length,
    });

    return { verstuurd: totaalVerstuurd, overgeslagen: totaalOvergeslagen, errors };
  },
});

async function processUserHerinneringen(params: {
  userId: string;
  herinneringDagen: number;
  template?: { onderwerp?: string; inhoud?: string };
  showLogo: boolean;
}): Promise<{ verstuurd: number; overgeslagen: number; errors: string[] }> {
  const { userId, herinneringDagen, template, showLogo } = params;
  const supabase = getSupabaseAdmin();
  const result = { verstuurd: 0, overgeslagen: 0, errors: [] as string[] };

  const drempelDatum = new Date(
    Date.now() - herinneringDagen * 86400000
  ).toISOString();

  // Find unanswered items older than threshold
  const { data: items } = await supabase
    .from("portaal_items")
    .select("id, titel, type, portaal_id, project_id, created_at")
    .eq("user_id", userId)
    .eq("status", "verstuurd")
    .eq("zichtbaar_voor_klant", true)
    .in("type", ["offerte", "tekening"])
    .lt("created_at", drempelDatum);

  if (!items || items.length === 0) return result;

  // Check which items already have a reminder (max 1 per item ever)
  const itemIds = items.map((i) => i.id);
  const { data: existing } = await supabase
    .from("notificaties")
    .select("bericht")
    .eq("user_id", userId)
    .eq("type", "portaal_herinnering")
    .in(
      "bericht",
      itemIds.map((id) => `herinnering:${id}`)
    );

  const alreadySent = new Set(
    (existing || []).map((n: { bericht: string }) =>
      n.bericht.replace("herinnering:", "")
    )
  );

  const toSend = items.filter((i) => !alreadySent.has(i.id));
  if (toSend.length === 0) return result;

  // Get portaal tokens
  const portaalIds = [...new Set(toSend.map((i) => i.portaal_id))];
  const { data: portalen } = await supabase
    .from("project_portalen")
    .select("id, token, project_id")
    .in("id", portaalIds)
    .eq("actief", true);

  if (!portalen || portalen.length === 0) return result;

  const portaalMap = new Map(
    portalen.map((p: { id: string; token: string; project_id: string }) => [p.id, p])
  );

  // Get project + klant info
  const projectIds = [...new Set(portalen.map((p: { project_id: string }) => p.project_id))];
  const { data: projecten } = await supabase
    .from("projecten")
    .select("id, naam, klant_id")
    .in("id", projectIds);

  const projectMap = new Map(
    (projecten || []).map((p: { id: string; naam: string; klant_id: string }) => [p.id, p])
  );

  const klantIds = [
    ...new Set(
      (projecten || [])
        .map((p: { klant_id: string }) => p.klant_id)
        .filter(Boolean)
    ),
  ];
  const { data: klanten } = await supabase
    .from("klanten")
    .select("id, email, contactpersoon")
    .in("id", klantIds);

  const klantMap = new Map(
    (klanten || []).map((k: { id: string; email: string; contactpersoon: string }) => [k.id, k])
  );

  // Get branding
  const { data: profile } = await supabase
    .from("profiles")
    .select("bedrijfsnaam, logo_url")
    .eq("id", userId)
    .maybeSingle();

  const { data: docStyle } = await supabase
    .from("document_styles")
    .select("primaire_kleur")
    .eq("user_id", userId)
    .maybeSingle();

  const bedrijfsnaam = profile?.bedrijfsnaam || "";
  const logoUrl = showLogo ? profile?.logo_url : undefined;
  const primaireKleur = docStyle?.primaire_kleur || undefined;

  const appUrl =
    process.env.VITE_APP_URL ||
    process.env.APP_URL ||
    "https://app.doen.team";

  // Send reminders
  for (const item of toSend) {
    const portaal = portaalMap.get(item.portaal_id);
    if (!portaal) continue;

    const project = projectMap.get(item.project_id);
    const klant = project ? klantMap.get(project.klant_id) : undefined;
    if (!klant?.email) {
      result.overgeslagen++;
      continue;
    }

    const portaalUrl = `${appUrl}/portaal/${portaal.token}`;
    const klantNaam = klant.contactpersoon || "klant";
    const projectNaam = project?.naam || "project";

    // Template variable replacement
    const vars: Record<string, string> = {
      klant_naam: klantNaam,
      klantnaam: klantNaam,
      bedrijfsnaam,
      project_naam: projectNaam,
      projectnaam: projectNaam,
      portaal_link: portaalUrl,
      item_type: item.titel,
    };

    const onderwerp = template?.onderwerp
      ? replaceTemplateVariables(template.onderwerp, vars)
      : `Herinnering: ${item.titel} wacht op uw reactie`;

    const heading = template?.inhoud
      ? replaceTemplateVariables(template.inhoud, vars)
      : `U heeft nog niet gereageerd op ${item.titel} voor project ${projectNaam}.`;

    const plainBody = [
      `Beste ${klantNaam},`,
      "",
      heading,
      "",
      `Bekijk het hier: ${portaalUrl}`,
      "",
      `Met vriendelijke groet,`,
      bedrijfsnaam || "Het team",
    ].join("\n");

    const htmlBody = buildPortalEmailHtml({
      heading: template?.inhoud ? heading : `Herinnering: ${item.titel}`,
      itemTitel: item.titel,
      beschrijving: template?.inhoud ? undefined : heading,
      ctaUrl: portaalUrl,
      bedrijfsnaam,
      logoUrl,
      primaireKleur,
    });

    const emailResult = await sendEmailForUser({
      userId,
      to: klant.email,
      subject: onderwerp,
      text: plainBody,
      html: htmlBody,
    });

    if (emailResult.success) {
      result.verstuurd++;
    } else {
      result.errors.push(`${item.titel}: ${emailResult.error}`);
    }

    // Log in notificaties (same pattern as existing code)
    await supabase.from("notificaties").insert({
      user_id: userId,
      type: "portaal_herinnering",
      titel: `Herinnering verstuurd: ${item.titel}`,
      bericht: `herinnering:${item.id}`,
      link: `/projecten/${item.project_id}?tab=portaal`,
      project_id: item.project_id,
      gelezen: false,
      actie_genomen: false,
    });

    // Log in portaal_activiteiten
    await supabase.from("portaal_activiteiten").insert({
      portaal_id: item.portaal_id,
      actie: "herinnering_verstuurd",
      metadata: {
        item_id: item.id,
        klant_email: klant.email,
        success: emailResult.success,
      },
    });
  }

  return result;
}
