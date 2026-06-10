import { logger, schedules, metadata } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";

const STORAGE_BUCKET = "email-attachments";
const TTL_DAYS = 30;
const BATCH_SIZE = 100;

// Grote bijlagen die als downloadlink zijn verstuurd (zie uploadGroteBijlage):
// link is 30 dagen geldig, bestand leeft 35 dagen.
const GROTE_BIJLAGEN_BUCKET = "documenten";
const GROTE_BIJLAGEN_PREFIX = "email-bijlagen-groot";
const GROTE_BIJLAGEN_TTL_DAYS = 35;

/**
 * Verwijdert verlopen email-attachment-cache rijen + bijbehorende
 * Storage-objects. Run dagelijks om 03:00 Europe/Amsterdam (rustig
 * tijdslot, geen overlap met andere crons om 08:00 / 09:00).
 *
 * Strategie: lees in batches van 100 om bij grote inboxen de geheugen-
 * voetafdruk laag te houden. Per batch eerst Storage opruimen, dan rijen.
 * Storage-remove fouten zijn niet-fataal — de DB-rij wordt alsnog
 * verwijderd zodat de cache niet vastloopt op orphans.
 */
export const emailAttachmentCleanupCron = schedules.task({
  id: "email-attachment-cleanup-cron",
  cron: { pattern: "0 3 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();
    logger.info("Email attachment cleanup gestart", {
      scheduledAt: payload.timestamp,
    });
    metadata.set("status", "scanning");

    const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    let totalDeleted = 0;
    let totalStorageErrors = 0;

    while (true) {
      const { data: expired, error } = await supabase
        .from("email_attachment_cache")
        .select("id, storage_path")
        .lt("cached_at", cutoff)
        .limit(BATCH_SIZE);

      if (error) {
        logger.error("Ophalen verlopen cache mislukt", { error: error.message });
        throw error;
      }
      if (!expired || expired.length === 0) break;

      const paths = expired.map((r) => r.storage_path as string);
      const { error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(paths);
      if (storageErr) {
        logger.warn("Storage remove mislukt (rijen worden wel verwijderd)", {
          error: storageErr.message,
          paths: paths.length,
        });
        totalStorageErrors += paths.length;
      }

      const ids = expired.map((r) => r.id as string);
      const { error: rowErr } = await supabase
        .from("email_attachment_cache")
        .delete()
        .in("id", ids);
      if (rowErr) {
        logger.error("Cache-rijen verwijderen mislukt", { error: rowErr.message });
        throw rowErr;
      }
      totalDeleted += expired.length;
      logger.info("Batch opgeruimd", { batch: expired.length, totaal: totalDeleted });
    }

    // Grote bijlagen (downloadlinks in verzonden mails, documenten-bucket):
    // links zijn 30 dagen geldig, bestanden gaan na 35 dagen weg zodat een
    // net-verstuurde link nooit dood is. Pad: email-bijlagen-groot/{userId}/...
    metadata.set("status", "cleaning-grote-bijlagen");
    let groteBijlagenDeleted = 0;
    const groteCutoff = Date.now() - GROTE_BIJLAGEN_TTL_DAYS * 24 * 60 * 60 * 1000;
    const { data: userDirs, error: dirErr } = await supabase.storage
      .from(GROTE_BIJLAGEN_BUCKET)
      .list(GROTE_BIJLAGEN_PREFIX, { limit: 1000 });
    if (dirErr) {
      logger.warn("Grote-bijlagen map lijst mislukt (niet-fataal)", { error: dirErr.message });
    } else {
      for (const dir of userDirs ?? []) {
        if (dir.id) continue; // bestanden op root-niveau slaan we over; we verwachten user-mappen
        const folder = `${GROTE_BIJLAGEN_PREFIX}/${dir.name}`;
        const { data: files, error: listErr } = await supabase.storage
          .from(GROTE_BIJLAGEN_BUCKET)
          .list(folder, { limit: 1000 });
        if (listErr) {
          logger.warn("Grote-bijlagen lijst mislukt", { folder, error: listErr.message });
          continue;
        }
        const verlopen = (files ?? [])
          .filter((f) => f.created_at && new Date(f.created_at).getTime() < groteCutoff)
          .map((f) => `${folder}/${f.name}`);
        if (verlopen.length === 0) continue;
        const { error: removeErr } = await supabase.storage
          .from(GROTE_BIJLAGEN_BUCKET)
          .remove(verlopen);
        if (removeErr) {
          logger.warn("Grote-bijlagen verwijderen mislukt", { folder, error: removeErr.message });
          totalStorageErrors += verlopen.length;
        } else {
          groteBijlagenDeleted += verlopen.length;
        }
      }
    }

    metadata.set("status", "completed");
    logger.info("Email attachment cleanup klaar", {
      totalDeleted,
      groteBijlagenDeleted,
      totalStorageErrors,
      ttlDays: TTL_DAYS,
    });
    return { totalDeleted, groteBijlagenDeleted, totalStorageErrors, ttlDays: TTL_DAYS };
  },
});
