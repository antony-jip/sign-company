import { createTransport } from "nodemailer";
import crypto from "crypto";
import { logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./supabase";

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
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const [ivHex, encHex] = encrypted.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  let decrypted = decipher.update(encHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface UserEmailCredentials {
  gmail_address: string;
  password: string;
  smtp_host: string;
  smtp_port: number;
  fromName?: string;
}

async function loadAfzenderNaam(userId: string, organisatieId: string | null): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (organisatieId) {
    const { data } = await supabase
      .from("app_settings")
      .select("afzender_naam")
      .eq("organisatie_id", organisatieId)
      .maybeSingle();
    const naam = (data?.afzender_naam || "").trim();
    if (naam) return naam;
  }
  const { data } = await supabase
    .from("app_settings")
    .select("afzender_naam")
    .eq("user_id", userId)
    .maybeSingle();
  const naam = (data?.afzender_naam || "").trim();
  return naam || null;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("bedrijfsnaam, organisatie_id")
    .eq("id", userId)
    .maybeSingle();

  const afzenderNaam = await loadAfzenderNaam(userId, profile?.organisatie_id || null);
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
 */
export async function sendEmailForUser(params: {
  userId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = await getUserEmailCredentials(params.userId);
    if (!creds) {
      return { success: false, error: "Geen email instellingen gevonden" };
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

    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    logger.info("Email verzonden", { to: params.to, subject: params.subject });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email verzenden mislukt";
    logger.error("Email verzenden mislukt", { error: msg, to: params.to });
    return { success: false, error: msg };
  }
}
