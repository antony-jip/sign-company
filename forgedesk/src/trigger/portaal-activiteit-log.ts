import { task, logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";

/**
 * Task: Log portaal activity to the portaal_activiteiten table.
 * Fire-and-forget — triggered from API routes and components.
 */
export const logPortaalActiviteit = task({
  id: "log-portaal-activiteit",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 5000 },
  run: async (payload: {
    portaalId: string;
    actie:
      | "bekeken"
      | "item_goedgekeurd"
      | "item_revisie"
      | "bericht_verstuurd"
      | "bestand_geupload"
      | "herinnering_verstuurd"
      | "email_geopend"
      | "portaal_aangemaakt"
      | "portaal_verlengd";
    metadata?: Record<string, unknown>;
    userId?: string;
  }) => {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from("portaal_activiteiten").insert({
      portaal_id: payload.portaalId,
      actie: payload.actie,
      metadata: payload.metadata || {},
    });

    if (error) {
      logger.error("Portaal activiteit loggen mislukt", {
        error: error.message,
        portaalId: payload.portaalId,
        actie: payload.actie,
      });
      throw new Error(`Insert failed: ${error.message}`);
    }

    logger.info("Portaal activiteit gelogd", {
      portaalId: payload.portaalId,
      actie: payload.actie,
    });

    return { logged: true };
  },
});
