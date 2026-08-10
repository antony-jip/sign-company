import { logger, schedules } from "@trigger.dev/sdk/v3";
import crypto from "crypto";
import { getSupabaseAdmin } from "./utils/supabase";

const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

// Exact roteert de refresh_token bij elke uitwisseling en de keten verloopt als
// hij een tijd niet gebruikt wordt. Tot nu toe roteerde die keten alleen als
// iemand een factuur synchroniseerde of het integratiescherm opende, dus een
// rustige periode kon de koppeling doodstil laten verlopen. Drie dagen zit ruim
// binnen elke geldigheidsduur die Exact hanteert en houdt het aantal rotaties
// laag, want elke extra rotatie is ook een extra kans op een verloren race.
const MAX_STILTE_DAGEN = 3;

// Zelfde formaat als api/save-integration-settings.ts: 'g1:' is AES-256-GCM met
// een random salt per waarde, daarvoor was het CBC met een vaste salt.
const INT_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || "";

function encryptSecret(text: string): string {
  if (!INT_KEY) return text;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(INT_KEY, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return "g1:" + Buffer.concat([salt, iv, cipher.getAuthTag(), ct]).toString("base64");
}

function decryptSecret(text: string): string {
  if (text && text.startsWith("g1:")) {
    if (!INT_KEY) throw new Error("INTEGRATION_ENCRYPTION_KEY ontbreekt");
    const raw = Buffer.from(text.slice(3), "base64");
    const key = crypto.scryptSync(INT_KEY, raw.subarray(0, 16), 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(16, 28));
    decipher.setAuthTag(raw.subarray(28, 44));
    return Buffer.concat([decipher.update(raw.subarray(44)), decipher.final()]).toString("utf8");
  }
  if (!text || !text.includes(":") || text.length < 34) return text;
  if (!INT_KEY) return text;
  const key = crypto.scryptSync(INT_KEY, "integration", 32);
  const [ivHex, enc] = text.split(":");
  if (!ivHex || ivHex.length !== 32 || !enc) return text;
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  return decipher.update(enc, "hex", "utf8") + decipher.final("utf8");
}

type Credentials = { clientId: string; clientSecret: string };

/**
 * Credentials staan org-breed of, bij oudere accounts, per user. Zelfde
 * volgorde als de api-routes: eerst de organisatie van de tokenhouder, dan zijn
 * persoonlijke rij.
 */
async function laadCredentials(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<Credentials | null> {
  const kolommen = "exact_online_client_id, exact_online_client_secret";

  const { data: profiel } = await supabase
    .from("profiles")
    .select("organisatie_id")
    .eq("id", userId)
    .maybeSingle();

  const orgId = (profiel as { organisatie_id?: string } | null)?.organisatie_id;

  let rij: Record<string, unknown> | null = null;
  if (orgId) {
    const { data } = await supabase
      .from("app_settings")
      .select(kolommen)
      .eq("organisatie_id", orgId)
      .maybeSingle();
    rij = (data as Record<string, unknown> | null) ?? null;
  }
  if (!rij) {
    const { data } = await supabase
      .from("app_settings")
      .select(kolommen)
      .eq("user_id", userId)
      .maybeSingle();
    rij = (data as Record<string, unknown> | null) ?? null;
  }

  const clientId = rij?.exact_online_client_id as string | undefined;
  const versleuteldSecret = rij?.exact_online_client_secret as string | undefined;
  if (!clientId || !versleuteldSecret) return null;

  return { clientId, clientSecret: decryptSecret(versleuteldSecret) };
}

/**
 * Scheduled task: houdt de Exact Online tokenketen levend.
 *
 * Deze job koppelt bewust nooit iets los. Een achtergrondjob die tokens
 * verwijdert, verbreekt een koppeling op een moment dat niemand kijkt; bij een
 * afgewezen keten laten we de rij dus staan en loggen we alleen. De gebruiker
 * ziet dat in het integratiescherm en verbindt zelf opnieuw.
 */
export const exactTokenKeepaliveCron = schedules.task({
  id: "exact-token-keepalive-cron",
  cron: { pattern: "20 4 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 300,
  run: async (payload) => {
    const supabase = getSupabaseAdmin();

    const grens = new Date(Date.now() - MAX_STILTE_DAGEN * 24 * 60 * 60 * 1000).toISOString();

    const { data: rijen, error } = await supabase
      .from("exact_tokens")
      .select("user_id, refresh_token, division, updated_at")
      .lt("updated_at", grens);

    if (error) throw new Error(`exact_tokens uitlezen mislukt: ${error.message}`);

    const tokens = (rijen ?? []) as Array<{
      user_id: string;
      refresh_token: string;
      division: number | null;
      updated_at: string;
    }>;

    logger.info("Exact keepalive gestart", {
      scheduledAt: payload.timestamp,
      kandidaten: tokens.length,
      stilteGrens: grens,
    });

    let ververst = 0;
    let afgewezen = 0;
    let overgeslagen = 0;

    for (const rij of tokens) {
      try {
        const credentials = await laadCredentials(supabase, rij.user_id);
        if (!credentials) {
          overgeslagen++;
          logger.warn("Exact keepalive: geen credentials", { user_id: rij.user_id });
          continue;
        }

        const res = await fetch(EXACT_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: decryptSecret(rij.refresh_token),
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
          }).toString(),
        });

        if (!res.ok) {
          const body = await res.text();
          afgewezen++;
          // Niet opruimen: zie de toelichting boven deze task.
          logger.error("Exact keepalive: refresh afgewezen", {
            user_id: rij.user_id,
            status: res.status,
            invalid_grant: body.includes("invalid_grant"),
          });
          continue;
        }

        const nieuw = (await res.json()) as {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };

        if (!nieuw.access_token || !nieuw.expires_in) {
          afgewezen++;
          logger.error("Exact keepalive: antwoord zonder token", { user_id: rij.user_id });
          continue;
        }

        // Compare-and-swap op de keten die we gelezen hebben, net als in de
        // api-routes. Raakt dit nul rijen, dan heeft een gebruiker in de
        // tussentijd zelf ververst of ontkoppeld en is die keten leidend.
        const { data: bijgewerkt } = await supabase
          .from("exact_tokens")
          .update({
            access_token: encryptSecret(nieuw.access_token),
            refresh_token: encryptSecret(nieuw.refresh_token || decryptSecret(rij.refresh_token)),
            expires_at: new Date(Date.now() + nieuw.expires_in * 1000).toISOString(),
            division: rij.division,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", rij.user_id)
          .eq("refresh_token", rij.refresh_token)
          .select("user_id");

        if (bijgewerkt?.length) {
          ververst++;
        } else {
          overgeslagen++;
          logger.warn("Exact keepalive: keten inmiddels vervangen", { user_id: rij.user_id });
        }
      } catch (err) {
        afgewezen++;
        logger.error("Exact keepalive: onverwachte fout", {
          user_id: rij.user_id,
          fout: err instanceof Error ? err.message : "onbekend",
        });
      }
    }

    logger.info("Exact keepalive klaar", { ververst, afgewezen, overgeslagen });

    return { kandidaten: tokens.length, ververst, afgewezen, overgeslagen };
  },
});
