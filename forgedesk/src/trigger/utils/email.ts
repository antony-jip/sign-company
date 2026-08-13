import { createTransport } from "nodemailer";
import crypto from "crypto";
import { logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./supabase";
import { checkAndMark, rollbackKey } from "./idempotency";

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;

function decrypt(encrypted: string): string {
  // Handle legacy base64 prefix
  if (encrypted.startsWith("b64:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString("utf8");
  }
  if (!ENCRYPTION_KEY) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY niet geconfigureerd. " +
      "Voeg deze toe aan het Trigger.dev dashboard."
    );
  }
  // g1: AES-256-GCM met willekeurige salt en auth-tag. Het oude CBC-formaat
  // had een vaste salt en geen integriteitscontrole. Beide oude vormen blijven
  // leesbaar zodat niemand buitengesloten raakt.
  if (encrypted.startsWith("g1:")) {
    try {
      const raw = Buffer.from(encrypted.slice(3), "base64");
      const salt = raw.subarray(0, 16);
      const iv = raw.subarray(16, 28);
      const tag = raw.subarray(28, 44);
      const ct = raw.subarray(44);
      const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    } catch {
      throw new Error("Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op");
    }
  }
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const [ivHex, encHex] = encrypted.split(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error("Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op");
  }
}

interface UserEmailCredentials {
  gmail_address: string;
  password: string;
  smtp_host: string;
  smtp_port: number;
  fromName?: string;
}

/**
 * Fetch and decrypt SMTP credentials for a user.
 */
export async function getUserEmailCredentials(userId: string): Promise<UserEmailCredentials | null> {
  const supabase = getSupabaseAdmin();

  const { data: settings } = await supabase
    .from("user_email_settings")
    .select("gmail_address, encrypted_app_password, smtp_host, smtp_port")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.gmail_address || !settings?.encrypted_app_password) {
    return null;
  }

  // Afzendernaam staat per-user op profiles (migratie 091); bedrijfsnaam als fallback.
  const { data: profile } = await supabase
    .from("profiles")
    .select("bedrijfsnaam, afzender_naam")
    .eq("id", userId)
    .maybeSingle();

  const afzenderNaam = (profile?.afzender_naam || "").trim() || null;
  const fromName = afzenderNaam || profile?.bedrijfsnaam?.trim() || undefined;

  return {
    gmail_address: settings.gmail_address,
    password: decrypt(settings.encrypted_app_password),
    smtp_host: settings.smtp_host || "smtp.gmail.com",
    smtp_port: settings.smtp_port || 587,
    fromName,
  };
}

/**
 * Send email via SMTP using a user's stored credentials.
 *
 * Optioneel `idempotencyKey` + `organisatieId` samen meegeven om dubbele
 * sends (retries, parallel runs) te voorkomen. De pre-send mark wordt
 * teruggedraaid bij een send-fout zodat een latere retry alsnog werkt.
 */
// Terugval voor automatiseringen: heeft de maker van het document geen eigen
// mailbox, dan gaat de mail via de mailbox van de organisatie-eigenaar. Zonder
// deze terugval vielen offerte-opvolging en factuurherinneringen stil voor
// elke gebruiker zonder gekoppelde mailbox, zonder dat iemand het merkte.
async function getCredentialsMetEigenaarFallback(
  userId: string
): Promise<{ creds: UserEmailCredentials | null; viaEigenaar: boolean }> {
  const eigen = await getUserEmailCredentials(userId);
  if (eigen) return { creds: eigen, viaEigenaar: false };

  const supabase = getSupabaseAdmin();
  const { data: profiel } = await supabase
    .from("profiles")
    .select("organisatie_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profiel?.organisatie_id) return { creds: null, viaEigenaar: false };

  const { data: org } = await supabase
    .from("organisaties")
    .select("eigenaar_id")
    .eq("id", profiel.organisatie_id)
    .maybeSingle();
  if (!org?.eigenaar_id || org.eigenaar_id === userId) return { creds: null, viaEigenaar: false };

  const eigenaarCreds = await getUserEmailCredentials(org.eigenaar_id);
  return { creds: eigenaarCreds, viaEigenaar: !!eigenaarCreds };
}

export async function sendEmailForUser(params: {
  userId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  organisatieId?: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const useIdempotency = !!(params.idempotencyKey && params.organisatieId);
  try {
    const { creds, viaEigenaar } = await getCredentialsMetEigenaarFallback(params.userId);
    if (!creds) {
      return { success: false, error: "Geen email instellingen gevonden" };
    }
    if (viaEigenaar) {
      logger.warn("Maker heeft geen mailbox; mail gaat via de organisatie-eigenaar", {
        userId: params.userId,
        to: params.to,
      });
    }

    if (useIdempotency) {
      const fresh = await checkAndMark(params.organisatieId!, params.idempotencyKey!);
      if (!fresh) {
        logger.warn("Email-send overgeslagen (duplicaat)", {
          to: params.to,
          key: params.idempotencyKey,
        });
        return { success: true, skipped: true };
      }
    }

    const transporter = createTransport({
      host: creds.smtp_host,
      port: creds.smtp_port,
      secure: creds.smtp_port === 465,
      auth: { user: creds.gmail_address, pass: creds.password },
    });

    const fromAddress = creds.fromName
      ? `"${creds.fromName.replace(/"/g, "")}" <${creds.gmail_address}>`
      : creds.gmail_address;

    // If `to` is empty, send to the user's own email (self-notification)
    const toAddress = params.to || creds.gmail_address;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: toAddress,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
    } catch (sendErr) {
      if (useIdempotency) {
        await rollbackKey(params.organisatieId!, params.idempotencyKey!);
      }
      throw sendErr;
    }

    logger.info("Email verzonden", { to: params.to, subject: params.subject });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email verzenden mislukt";
    logger.error("Email verzenden mislukt", { error: msg, to: params.to });
    return { success: false, error: msg };
  }
}
