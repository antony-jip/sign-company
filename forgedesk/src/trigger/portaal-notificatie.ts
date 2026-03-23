import { task, logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { buildPortalEmailHtml } from "./utils/emailTemplate";

/**
 * Task: Send notification to business user when a client reacts on the portaal.
 * Triggered from api/portaal-reactie.ts after saving the reaction.
 */
export const portaalReactieNotificatie = task({
  id: "portaal-reactie-notificatie",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2000, maxTimeoutInMs: 30000 },
  run: async (payload: {
    portaalId: string;
    userId: string;
    projectId: string;
    reactieType: "goedkeuring" | "revisie" | "bericht";
    klantNaam: string;
    itemTitel: string;
    projectNaam: string;
    bericht?: string;
  }) => {
    const supabase = getSupabaseAdmin();
    const {
      portaalId,
      userId,
      projectId,
      reactieType,
      klantNaam,
      itemTitel,
      projectNaam,
      bericht,
    } = payload;

    const actieLabel =
      reactieType === "goedkeuring" ? "goedgekeurd" :
      reactieType === "revisie" ? "revisie gevraagd" :
      "een bericht gestuurd";

    // Create in-app notification
    const notifType =
      reactieType === "goedkeuring" ? "portaal_goedkeuring" :
      reactieType === "revisie" ? "portaal_revisie" :
      "portaal_bericht";

    await supabase.from("notificaties").insert({
      user_id: userId,
      type: notifType,
      titel: `${klantNaam} heeft ${actieLabel}`,
      bericht: bericht?.trim()
        ? `"${bericht.trim()}" — ${itemTitel} (${projectNaam})`
        : `${itemTitel} — ${projectNaam}`,
      link: `/projecten/${projectId}`,
      project_id: projectId,
      actie_genomen: false,
      gelezen: false,
    });

    // Get branding
    const { data: profile } = await supabase
      .from("profiles")
      .select("logo_url, bedrijfsnaam")
      .eq("id", userId)
      .maybeSingle();

    const { data: docStyle } = await supabase
      .from("document_styles")
      .select("primaire_kleur")
      .eq("user_id", userId)
      .maybeSingle();

    const appUrl =
      process.env.VITE_APP_URL ||
      process.env.APP_URL ||
      "https://app.doen.team";

    const onderwerp =
      reactieType === "goedkeuring" ? `Goedgekeurd: ${itemTitel} — ${klantNaam}` :
      reactieType === "revisie" ? `Revisie gevraagd: ${itemTitel} — ${klantNaam}` :
      `Nieuw bericht: ${itemTitel} — ${klantNaam}`;

    const plainBody = [
      `${klantNaam} heeft ${actieLabel}:`,
      bericht?.trim() ? `\n"${bericht.trim()}"` : "",
      `\nItem: ${itemTitel}`,
      `Project: ${projectNaam}`,
      `\nBekijk: ${appUrl}/projecten/${projectId}`,
    ].filter(Boolean).join("\n");

    const htmlBody = buildPortalEmailHtml({
      heading: `${klantNaam} heeft ${actieLabel}`,
      itemTitel,
      beschrijving: `Project: ${projectNaam}`,
      quote: bericht?.trim() || undefined,
      ctaLabel: "Bekijk in portaal \u2192",
      ctaUrl: `${appUrl}/projecten/${projectId}`,
      bedrijfsnaam: profile?.bedrijfsnaam || undefined,
      logoUrl: profile?.logo_url || undefined,
      primaireKleur: docStyle?.primaire_kleur || undefined,
    });

    // Send email to business user
    const emailResult = await sendEmailForUser({
      userId,
      to: "", // sendEmailForUser uses the user's own email from credentials
      subject: onderwerp,
      text: plainBody,
      html: htmlBody,
    });

    // Log activity
    await supabase.from("portaal_activiteiten").insert({
      portaal_id: portaalId,
      actie: reactieType === "goedkeuring" ? "item_goedgekeurd" :
             reactieType === "revisie" ? "item_revisie" :
             "bericht_verstuurd",
      metadata: { klant_naam: klantNaam, item_titel: itemTitel },
    });

    logger.info("Portaal reactie notificatie verzonden", {
      reactieType,
      klantNaam,
      emailSuccess: emailResult.success,
    });

    return { notified: true, emailSent: emailResult.success };
  },
});

/**
 * Task: Send notification to client when a new item is shared on the portaal.
 * Triggered from ProjectPortaalTab when sharing items.
 */
export const portaalItemNotificatie = task({
  id: "portaal-item-notificatie",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 2000, maxTimeoutInMs: 30000 },
  run: async (payload: {
    portaalId: string;
    userId: string;
    klantEmail: string;
    klantNaam: string;
    bedrijfsNaam: string;
    projectNaam: string;
    portaalLink: string;
    itemType: "offerte" | "tekening" | "factuur" | "bestand" | "bericht";
    itemTitel?: string;
    logoUrl?: string;
    primaireKleur?: string;
  }) => {
    const supabase = getSupabaseAdmin();
    const {
      portaalId,
      userId,
      klantEmail,
      klantNaam,
      bedrijfsNaam,
      projectNaam,
      portaalLink,
      itemType,
      itemTitel,
      logoUrl,
      primaireKleur,
    } = payload;

    const titel = itemTitel || itemType;

    const onderwerp = `${bedrijfsNaam || "Nieuw item"} — ${titel}`;

    const plainBody = [
      `Beste ${klantNaam},`,
      "",
      `Er is een nieuw item gedeeld voor project ${projectNaam}.`,
      "",
      `Item: ${titel}`,
      "",
      `Bekijk het hier: ${portaalLink}`,
      "",
      `Met vriendelijke groet,`,
      bedrijfsNaam || "Het team",
    ].join("\n");

    const htmlBody = buildPortalEmailHtml({
      heading: `Er is een nieuw item gedeeld voor project ${projectNaam}.`,
      itemTitel: titel,
      beschrijving: `Project: ${projectNaam}`,
      ctaUrl: portaalLink,
      bedrijfsnaam: bedrijfsNaam,
      logoUrl,
      primaireKleur,
    });

    const emailResult = await sendEmailForUser({
      userId,
      to: klantEmail,
      subject: onderwerp,
      text: plainBody,
      html: htmlBody,
    });

    // Log activity
    await supabase.from("portaal_activiteiten").insert({
      portaal_id: portaalId,
      actie: "email_verstuurd",
      metadata: { klant_email: klantEmail, item_type: itemType, item_titel: titel },
    });

    logger.info("Portaal item notificatie verzonden", {
      klantEmail,
      itemType,
      emailSuccess: emailResult.success,
    });

    return { notified: true, emailSent: emailResult.success };
  },
});
