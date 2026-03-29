import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import { sendEmailForUser } from "./utils/email";
import { buildPortalEmailHtml, replaceTemplateVariables } from "./utils/emailTemplate";

/**
 * Offerte opvolging cron — elke ochtend om 08:00 CET.
 *
 * Per organisatie:
 * 1. Haal het actieve default schema + stappen op
 * 2. Haal alle openstaande offertes op (verzonden/bekeken, opvolging_actief)
 * 3. Per offerte: evalueer welke stap moet draaien
 * 4. Stuur email / melding op basis van actie type
 * 5. Log alles in offerte_opvolg_log
 */
export const offerteOpvolgingCron = schedules.task({
  id: "offerte-opvolging-cron",
  cron: { pattern: "0 8 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    logger.info("Offerte opvolging cron gestart", {
      scheduledAt: payload.timestamp,
    });

    metadata.set("status", "scanning");

    // Get all organisaties that have active opvolg schemas
    const { data: schemas } = await supabase
      .from("offerte_opvolg_schemas")
      .select("id, organisatie_id, stappen:offerte_opvolg_stappen(*)")
      .eq("is_default", true)
      .eq("actief", true);

    if (!schemas || schemas.length === 0) {
      logger.info("Geen actieve opvolg schemas gevonden");
      return { verstuurd: 0, overgeslagen: 0, errors: [] };
    }

    let totaalVerstuurd = 0;
    let totaalOvergeslagen = 0;
    const errors: string[] = [];

    for (const schema of schemas) {
      const stappen = ((schema.stappen || []) as StapRow[])
        .filter((s) => s.actief)
        .sort((a, b) => a.stap_nummer - b.stap_nummer);

      if (stappen.length === 0) continue;

      // Get all users in this org
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, bedrijfsnaam, logo_url")
        .eq("organisatie_id", schema.organisatie_id);

      if (!profiles || profiles.length === 0) continue;

      const userIds = profiles.map((p: { id: string }) => p.id);

      // Get all offertes with opvolging active, status verzonden/bekeken
      const { data: offertes } = await supabase
        .from("offertes")
        .select("id, user_id, klant_id, project_id, nummer, titel, totaal, status, verstuurd_op, verzendwijze, opvolging_actief, opvolging_schema_id, bekeken_door_klant, aantal_keer_bekeken, publiek_token")
        .in("user_id", userIds)
        .in("status", ["verzonden", "bekeken"])
        .or("opvolging_actief.is.null,opvolging_actief.eq.true");

      if (!offertes || offertes.length === 0) continue;

      // Filter to offertes that use this schema (or no override)
      const relevantOffertes = offertes.filter(
        (o: OfferteRow) =>
          !o.opvolging_schema_id || o.opvolging_schema_id === schema.id
      );

      // Get existing log entries for these offertes
      const offerteIds = relevantOffertes.map((o: OfferteRow) => o.id);
      const { data: existingLogs } = await supabase
        .from("offerte_opvolg_log")
        .select("offerte_id, stap_id, resultaat")
        .in("offerte_id", offerteIds);

      const logsByOfferte = new Map<string, Set<string>>();
      for (const log of existingLogs || []) {
        const l = log as { offerte_id: string; stap_id: string };
        if (!logsByOfferte.has(l.offerte_id)) {
          logsByOfferte.set(l.offerte_id, new Set());
        }
        logsByOfferte.get(l.offerte_id)!.add(l.stap_id);
      }

      // Batch fetch klant info
      const klantIds = [...new Set(relevantOffertes.map((o: OfferteRow) => o.klant_id).filter(Boolean))];
      const { data: klanten } = await supabase
        .from("klanten")
        .select("id, bedrijfsnaam, contactpersoon, email, contactpersonen")
        .in("id", klantIds);

      const klantMap = new Map(
        (klanten || []).map((k: KlantRow) => [k.id, k])
      );

      // Batch fetch project info
      const projectIds = [...new Set(relevantOffertes.map((o: OfferteRow) => o.project_id).filter(Boolean))];
      const { data: projecten } = await supabase
        .from("projecten")
        .select("id, naam")
        .in("id", projectIds.length > 0 ? projectIds : ["__none__"]);

      const projectMap = new Map(
        (projecten || []).map((p: { id: string; naam: string }) => [p.id, p])
      );

      // Get portaal tokens for portaal-sent offertes
      const portaalOfferteIds = relevantOffertes
        .filter((o: OfferteRow) => o.verzendwijze === "via_portaal" && o.project_id)
        .map((o: OfferteRow) => o.id);
      const { data: portaalItems } = portaalOfferteIds.length > 0
        ? await supabase
            .from("portaal_items")
            .select("offerte_id, portaal_id")
            .eq("type", "offerte")
            .in("offerte_id", portaalOfferteIds)
        : { data: [] };

      const portaalItemMap = new Map(
        (portaalItems || []).map((pi: { offerte_id: string; portaal_id: string }) => [pi.offerte_id, pi.portaal_id])
      );

      // Get portaal tokens
      const portaalIds = [...new Set((portaalItems || []).map((pi: { portaal_id: string }) => pi.portaal_id))];
      const { data: portalenData } = portaalIds.length > 0
        ? await supabase
            .from("project_portalen")
            .select("id, token")
            .in("id", portaalIds)
            .eq("actief", true)
        : { data: [] };

      const portaalTokenMap = new Map(
        (portalenData || []).map((p: { id: string; token: string }) => [p.id, p.token])
      );

      // Get document styles for branding
      const { data: docStyles } = await supabase
        .from("document_styles")
        .select("user_id, primaire_kleur")
        .in("user_id", userIds);

      const docStyleMap = new Map(
        (docStyles || []).map((d: { user_id: string; primaire_kleur: string }) => [d.user_id, d])
      );

      const profileMap = new Map(
        profiles.map((p: { id: string; bedrijfsnaam: string; logo_url: string }) => [p.id, p])
      );

      const appUrl =
        process.env.VITE_APP_URL ||
        process.env.APP_URL ||
        "https://app.doen.team";

      const now = new Date();

      for (const offerte of relevantOffertes as OfferteRow[]) {
        // Skip handmatig verstuurd (unless opvolging explicitly turned on)
        if (offerte.verzendwijze === "via_handmatig" && offerte.opvolging_actief !== true) {
          totaalOvergeslagen++;
          continue;
        }

        const verstuurdOp = offerte.verstuurd_op
          ? new Date(offerte.verstuurd_op)
          : null;
        if (!verstuurdOp) {
          totaalOvergeslagen++;
          continue;
        }

        const dagenOpen = Math.floor(
          (now.getTime() - verstuurdOp.getTime()) / 86400000
        );

        const executedStapIds = logsByOfferte.get(offerte.id) || new Set();

        // Find the next stap to execute
        for (const stap of stappen) {
          if (executedStapIds.has(stap.id)) continue;
          if (dagenOpen < stap.dagen_na_versturen) continue;

          // Check conditions
          const isBekeken =
            offerte.bekeken_door_klant === true ||
            (offerte.aantal_keer_bekeken ?? 0) > 0;

          // For via_email_pdf, skip "niet bekeken" check (no tracking)
          const skipBekekenCheck = offerte.verzendwijze === "via_email_pdf";

          if (stap.alleen_als_niet_bekeken && !skipBekekenCheck && isBekeken) {
            await logOpvolgActie(supabase, offerte.id, stap.id, stap.actie, "overgeslagen_bekeken");
            totaalOvergeslagen++;
            continue;
          }

          // "niet gereageerd" = offerte is still in verzonden/bekeken (not goedgekeurd/afgewezen)
          const heeftGereageerd = !["verzonden", "bekeken"].includes(offerte.status);
          if (stap.alleen_als_niet_gereageerd && heeftGereageerd) {
            await logOpvolgActie(supabase, offerte.id, stap.id, stap.actie, "overgeslagen_gereageerd");
            totaalOvergeslagen++;
            continue;
          }

          // Build merge vars
          const klant = klantMap.get(offerte.klant_id);
          const project = offerte.project_id ? projectMap.get(offerte.project_id) : null;
          const profile = profileMap.get(offerte.user_id);
          const docStyle = docStyleMap.get(offerte.user_id);

          const klantNaam = klant?.bedrijfsnaam || "klant";
          const contactpersoon = klant?.contactpersoon || klant?.contactpersonen?.[0]?.naam || klantNaam;
          const klantEmail = klant?.email || klant?.contactpersonen?.[0]?.email;
          const bedrijfsnaam = profile?.bedrijfsnaam || "";
          const projectNaam = project?.naam || "";
          // Build the correct link based on verzendwijze
          let offerteLink = "";
          if (offerte.verzendwijze === "via_portaal") {
            // Portaal-sent: link to portaal page
            const portaalId = portaalItemMap.get(offerte.id);
            const pToken = portaalId ? portaalTokenMap.get(portaalId) : undefined;
            if (pToken) {
              offerteLink = `${appUrl}/portaal/${pToken}`;
            }
          }
          // Fallback to publiek_token for PDF-sent or when portaal token not found
          if (!offerteLink && offerte.publiek_token) {
            offerteLink = `${appUrl}/offerte-bekijken/${offerte.publiek_token}`;
          }

          const vars: Record<string, string> = {
            klant_naam: klantNaam,
            contactpersoon,
            offerte_nummer: offerte.nummer,
            offerte_bedrag: new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(offerte.totaal),
            project_naam: projectNaam,
            verstuurd_op: verstuurdOp.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }),
            dagen_open: String(dagenOpen),
            bedrijfsnaam,
            afzender_naam: bedrijfsnaam,
            offerte_link: offerteLink,
            portaal_link: offerteLink,
          };

          const onderwerp = replaceTemplateVariables(stap.onderwerp, vars);
          const inhoud = replaceTemplateVariables(stap.inhoud, vars);

          try {
            // Email naar klant
            if ((stap.actie === "email_klant" || stap.actie === "email_en_melding") && klantEmail) {
              const plainBody = inhoud;
              const htmlBody = buildPortalEmailHtml({
                heading: onderwerp,
                itemTitel: offerte.nummer,
                beschrijving: inhoud.replace(/\n/g, "<br/>"),
                ctaUrl: vars.offerte_link || undefined,
                ctaLabel: "Bekijk offerte →",
                bedrijfsnaam,
                logoUrl: profile?.logo_url || undefined,
                primaireKleur: docStyle?.primaire_kleur || undefined,
              });

              const emailResult = await sendEmailForUser({
                userId: offerte.user_id,
                to: klantEmail,
                subject: onderwerp,
                text: plainBody,
                html: htmlBody,
              });

              if (!emailResult.success) {
                await logOpvolgActie(supabase, offerte.id, stap.id, stap.actie, "fout", { error: emailResult.error });
                errors.push(`${offerte.nummer}: ${emailResult.error}`);
                continue;
              }
            }

            // Interne melding
            if (stap.actie === "melding_intern" || stap.actie === "email_en_melding") {
              await supabase.from("notificaties").insert({
                user_id: offerte.user_id,
                type: "offerte_opvolging",
                titel: onderwerp,
                bericht: inhoud.substring(0, 500),
                link: `/offertes/${offerte.id}`,
                gelezen: false,
                actie_genomen: false,
              });
            }

            await logOpvolgActie(supabase, offerte.id, stap.id, stap.actie, "verstuurd", {
              klant_email: klantEmail,
              dagen_open: dagenOpen,
            });
            totaalVerstuurd++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Onbekende fout";
            await logOpvolgActie(supabase, offerte.id, stap.id, stap.actie, "fout", { error: msg });
            errors.push(`${offerte.nummer}: ${msg}`);
          }

          // Only execute one stap per offerte per run
          break;
        }
      }
    }

    metadata.set("status", "completed");
    metadata.set("verstuurd", totaalVerstuurd);
    metadata.set("overgeslagen", totaalOvergeslagen);

    logger.info("Offerte opvolging cron afgerond", {
      verstuurd: totaalVerstuurd,
      overgeslagen: totaalOvergeslagen,
      errors: errors.length,
    });

    return { verstuurd: totaalVerstuurd, overgeslagen: totaalOvergeslagen, errors };
  },
});

// ── Helpers ──

async function logOpvolgActie(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  offerteId: string,
  stapId: string,
  actie: string,
  resultaat: string,
  meta?: Record<string, unknown>
) {
  await supabase
    .from("offerte_opvolg_log")
    .insert({
      offerte_id: offerteId,
      stap_id: stapId,
      actie,
      resultaat,
      metadata: meta || {},
    })
    .then(() => {}, (err: Error) => {
      logger.error("Failed to log opvolg actie", { error: err.message });
    });
}

// Row types for Supabase responses
interface OfferteRow {
  id: string;
  user_id: string;
  klant_id: string;
  project_id?: string;
  nummer: string;
  titel: string;
  totaal: number;
  status: string;
  verstuurd_op?: string;
  verzendwijze?: string;
  opvolging_actief?: boolean;
  opvolging_schema_id?: string;
  bekeken_door_klant?: boolean;
  aantal_keer_bekeken?: number;
  publiek_token?: string;
}

interface StapRow {
  id: string;
  schema_id: string;
  stap_nummer: number;
  dagen_na_versturen: number;
  actie: string;
  onderwerp: string;
  inhoud: string;
  alleen_als_niet_bekeken: boolean;
  alleen_als_niet_gereageerd: boolean;
  actief: boolean;
}

interface KlantRow {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  contactpersonen?: { naam: string; email: string }[];
}
