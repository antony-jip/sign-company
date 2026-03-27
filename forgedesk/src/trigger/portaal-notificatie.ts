import { task, logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { sendClientEmail, sendSystemEmail } from "./utils/resend";

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

    const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://app.doen.team";

    const onderwerp =
      reactieType === "goedkeuring" ? `Goedgekeurd: ${itemTitel} — ${klantNaam}` :
      reactieType === "revisie" ? `Revisie gevraagd: ${itemTitel} — ${klantNaam}` :
      `Nieuw bericht: ${itemTitel} — ${klantNaam}`;

    // Get user email for notification
    const { data: emailSettings } = await supabase
      .from("user_email_settings")
      .select("gmail_address")
      .eq("user_id", userId)
      .maybeSingle();

    // Send system notification to user via Resend
    const emailResult = emailSettings?.gmail_address
      ? await sendSystemEmail({
          to: emailSettings.gmail_address,
          subject: onderwerp,
          heading: `${klantNaam} heeft ${actieLabel}`,
          itemTitel,
          projectNaam,
          quote: bericht?.trim() || undefined,
          ctaUrl: `${appUrl}/projecten/${projectId}`,
        })
      : { success: false, error: "No email configured" };

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

    // Get user's email for reply-to
    const { data: emailSettings } = await supabase
      .from("user_email_settings")
      .select("gmail_address")
      .eq("user_id", userId)
      .maybeSingle();

    const replyTo = emailSettings?.gmail_address || "";

    // Send to client via Resend (from bedrijfsnaam)
    const emailResult = await sendClientEmail({
      to: klantEmail,
      replyTo,
      subject: `${bedrijfsNaam || "Nieuw item"} — ${titel}`,
      bedrijfsnaam: bedrijfsNaam,
      heading: `Er staat iets klaar voor project ${projectNaam}.`,
      itemTitel: titel,
      beschrijving: `Project: ${projectNaam}`,
      ctaUrl: portaalLink,
      ctaLabel: "Bekijk in portaal →",
      logoUrl,
      primaireKleur,
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
