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

function isWrappedHtml(html: string): boolean {
  const trimmed = html.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

function wrapHtmlDocument(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/&(?:ldquo|rdquo);/g, '"')
    .replace(/&(?:lsquo|rsquo);/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Zorgt voor multipart/alternative bij HTML-mails: html-body wordt gewrapt
 * met DOCTYPE + minimal head zodra dat ontbreekt, en plain-text alternatief
 * wordt uit de uiteindelijke html afgeleid wanneer de caller geen text gaf,
 * zodat clients zonder HTML-render geen letterlijke `<br/>` tags zien.
 * Geëxporteerd zodat ook flows die niet via `sendEmailForUser` lopen
 * (zoals reply-threading in email-opvolging) hier doorheen kunnen.
 */
export function prepareMailBodies(
  html: string | undefined,
  text: string,
): { html: string | undefined; text: string } {
  if (!html) return { html: undefined, text };
  const wrappedHtml = isWrappedHtml(html) ? html : wrapHtmlDocument(html);
  const finalText = text && text.trim().length > 0 ? text : htmlToPlainText(wrappedHtml);
  return { html: wrappedHtml, text: finalText };
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

    const { html: finalHtml, text: finalText } = prepareMailBodies(params.html, params.text);

    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: params.subject,
      text: finalText,
      html: finalHtml,
    });

    logger.info("Email verzonden", { to: params.to, subject: params.subject });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email verzenden mislukt";
    logger.error("Email verzenden mislukt", { error: msg, to: params.to });
    return { success: false, error: msg };
  }
}
