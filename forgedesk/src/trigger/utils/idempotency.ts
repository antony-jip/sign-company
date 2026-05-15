import { logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./supabase";

/**
 * Canonical idempotency-key voor outbound mail. Format:
 *   `${taskName}:${entityId}` of `${taskName}:${entityId}:${stepNr}`
 * zodat de combinatie (organisatie_id, idempotency_key) uniek is per
 * logische mail-actie.
 */
export function buildKey(
  taskName: string,
  entityId: string,
  stepNr?: number | string,
): string {
  return stepNr !== undefined && stepNr !== null
    ? `${taskName}:${entityId}:${stepNr}`
    : `${taskName}:${entityId}`;
}

/**
 * Insert (organisatie_id, key) in email_send_idempotency. Returns true als
 * de rij nieuw was (caller mag versturen), false als er al een rij stond
 * (duplicaat, caller moet skippen). Bij onverwachte DB-errors: fail-open
 * met return true, zodat een mogelijke dubbele mail acceptabeler is dan
 * een gemiste mail bij infrastructuur-flap.
 */
export async function checkAndMark(
  organisatieId: string,
  key: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("email_send_idempotency")
    .insert({ organisatie_id: organisatieId, idempotency_key: key });

  if (!error) return true;

  // 23505 = unique_violation in Postgres
  if (error.code === "23505") return false;

  logger.error("Idempotency-mark faalde, fail-open", {
    error: error.message,
    code: error.code,
    key,
  });
  return true;
}

/**
 * Verwijder een eerder geplaatste mark. Aanroepen wanneer een send na een
 * succesvolle mark alsnog faalt, zodat een latere retry de mail wel kan
 * versturen.
 */
export async function rollbackKey(
  organisatieId: string,
  key: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("email_send_idempotency")
    .delete()
    .eq("organisatie_id", organisatieId)
    .eq("idempotency_key", key);

  if (error) {
    logger.error("Idempotency-rollback faalde", {
      error: error.message,
      code: error.code,
      key,
    });
  }
}
