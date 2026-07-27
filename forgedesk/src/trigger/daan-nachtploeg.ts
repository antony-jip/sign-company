import { schedules, logger } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";

/**
 * Daan-nachtploeg — elke nacht om 05:00 CET.
 *
 * Leest per organisatie de onverwerkte ai_sporen van de afgelopen dagen,
 * destilleert daar blijvende feiten uit (lezers op Haiku, synthese op
 * Sonnet) en zet die als status 'voorgesteld' in ai_geheugen. De gebruiker
 * neemt ze 's ochtends aan of wijst ze af in het dashboard-blok.
 *
 * Kosten landen op ai_rondes.kosten_eur en bewust NIET in ai_usage_org:
 * de nachtploeg is productkosten en telt niet mee in de €15-cap van de
 * organisatie. Lock per organisatie via de partial unique index op
 * ai_rondes(status='bezig').
 */

const MIN_SPOREN = 5;
const MAX_SPOREN_PER_RONDE = 150;
const LEZER_BATCH = 15;
const MAX_VOORSTELLEN = 5;
const SPOREN_RETENTIE_DAGEN = 30;

const LEZER_MODEL = "claude-haiku-4-5-20251001";
const SYNTHESE_MODEL = "claude-sonnet-5";
// Zelfde koers als de rest van de app (utils/visualizerDefaults.ts).
const USD_NAAR_EUR = 0.92;
const TARIEF: Record<string, { input: number; output: number }> = {
  [LEZER_MODEL]: { input: 1, output: 5 },
  [SYNTHESE_MODEL]: { input: 3, output: 15 },
};

interface Spoor {
  id: string;
  agent: string;
  klant_id: string | null;
  inhoud: Record<string, unknown>;
  created_at: string;
}

interface Kandidaat {
  onderwerp_type: "klant" | "algemeen";
  klant_naam?: string;
  inhoud: string;
}

async function anthropic(
  model: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<{ text: string; kostenEur: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet geconfigureerd");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}`);

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };
  const tarief = TARIEF[model] ?? TARIEF[SYNTHESE_MODEL];
  const kostenEur =
    ((data.usage.input_tokens / 1_000_000) * tarief.input +
      (data.usage.output_tokens / 1_000_000) * tarief.output) *
    USD_NAAR_EUR;
  const text = (data.content || [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n");
  return { text, kostenEur };
}

/** Modellen leveren JSON soms met tekst eromheen; pak het eerste array-blok. */
function parseJsonArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

const LEZER_SYSTEM = `Je leest ruwe sporen van AI-assistenten van een Nederlands signbedrijf (offertes, mails, facturen, montage). Destilleer daar BLIJVENDE feiten uit over klanten of het bedrijf: vaste voorkeuren, werkwijzen, bijzonderheden op locatie. Voorbeelden: "wil een PO-nummer op elke factuur", "montage alleen op maandag", "hoogwerker nodig op dit adres".
NIET: eenmalige gebeurtenissen, bedragen of datums van losse klussen, meningen, of iets dat maar één keer voorkomt zonder duidelijk blijvend karakter. Bij twijfel: weglaten. Liever nul feiten dan een verzonnen feit.
Antwoord UITSLUITEND met een JSON-array (leeg mag): [{"onderwerp_type":"klant"|"algemeen","klant_naam":"...(exact zoals in het spoor)","inhoud":"één kort feitelijk feit, max 200 tekens"}]`;

const SYNTHESE_SYSTEM = `Je bent de nachtelijke consolidatie van een AI-geheugen. Je krijgt kandidaat-feiten uit meerdere lezers plus het bestaande geheugen. Taak:
1. Voeg duplicaten en bijna-duplicaten samen tot één formulering.
2. Laat alles vallen wat al (vrijwel identiek) in het bestaande geheugen staat.
3. Laat zwakke of eenmalige observaties vallen.
4. Houd maximaal ${MAX_VOORSTELLEN} voorstellen over, de sterkste eerst (vaakst gezien, meerdere bronnen).
Antwoord UITSLUITEND met een JSON-array (leeg mag): [{"onderwerp_type":"klant"|"algemeen","klant_naam":"...","inhoud":"max 200 tekens"}]`;

export const daanNachtploegCron = schedules.task({
  id: "daan-nachtploeg-cron",
  cron: { pattern: "0 5 * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 900,
  run: async () => {
    const supabase = getSupabaseAdmin();

    // Retentie: sporen zijn wegwerpmateriaal na de bewaartermijn.
    const grens = new Date(Date.now() - SPOREN_RETENTIE_DAGEN * 24 * 3600 * 1000).toISOString();
    await supabase.from("ai_sporen").delete().lt("created_at", grens);

    // Organisaties met onverwerkte sporen (distinct client-side; de tabel
    // blijft klein door de retentie).
    const { data: onverwerkt } = await supabase
      .from("ai_sporen")
      .select("organisatie_id")
      .is("verwerkt_in_ronde", null);
    const orgIds = [...new Set((onverwerkt ?? []).map((r) => r.organisatie_id as string))];

    let rondes = 0;
    let overgeslagen = 0;

    for (const orgId of orgIds) {
      const { data: sporen } = await supabase
        .from("ai_sporen")
        .select("id, agent, klant_id, inhoud, created_at")
        .eq("organisatie_id", orgId)
        .is("verwerkt_in_ronde", null)
        .order("created_at", { ascending: true })
        .limit(MAX_SPOREN_PER_RONDE);

      if (!sporen || sporen.length < MIN_SPOREN) {
        overgeslagen++;
        continue;
      }

      // Lock: de partial unique index op (organisatie_id) WHERE status='bezig'
      // laat maar één ronde tegelijk toe; een tweede insert faalt en we slaan
      // de org deze nacht over.
      const { data: ronde, error: lockFout } = await supabase
        .from("ai_rondes")
        .insert({ organisatie_id: orgId, status: "bezig", sporen_gelezen: sporen.length })
        .select("id")
        .single();
      if (lockFout || !ronde) {
        logger.warn("Ronde-lock niet gekregen", { orgId });
        continue;
      }

      let kostenEur = 0;
      try {
        // Bestaand geheugen en klantnamen voor dedup en resolutie.
        const [{ data: bestaand }, { data: klanten }] = await Promise.all([
          supabase
            .from("ai_geheugen")
            .select("inhoud")
            .eq("organisatie_id", orgId)
            .in("status", ["waargenomen", "voorgesteld", "actief"])
            .limit(100),
          supabase
            .from("klanten")
            .select("id, bedrijfsnaam")
            .eq("organisatie_id", orgId),
        ]);

        // Lezers: elke batch sporen apart, klein blikveld, goedkoop model.
        const kandidaten: Kandidaat[] = [];
        for (let i = 0; i < (sporen as Spoor[]).length; i += LEZER_BATCH) {
          const batch = (sporen as Spoor[]).slice(i, i + LEZER_BATCH);
          const batchTekst = batch
            .map((s) => `[${s.agent}] ${JSON.stringify(s.inhoud)}`)
            .join("\n");
          try {
            const { text, kostenEur: k } = await anthropic(
              LEZER_MODEL,
              LEZER_SYSTEM,
              batchTekst,
              1024
            );
            kostenEur += k;
            kandidaten.push(...parseJsonArray<Kandidaat>(text));
          } catch (e) {
            logger.warn("Lezer-batch mislukt, overgeslagen", { orgId, batch: i, fout: String(e) });
          }
        }

        // Synthese: alle kandidaten naast het bestaande geheugen.
        let voorstellen: Kandidaat[] = [];
        if (kandidaten.length > 0) {
          const syntheseInput = `KANDIDATEN:\n${JSON.stringify(kandidaten)}\n\nBESTAAND GEHEUGEN:\n${JSON.stringify((bestaand ?? []).map((b) => b.inhoud))}`;
          const { text, kostenEur: k } = await anthropic(
            SYNTHESE_MODEL,
            SYNTHESE_SYSTEM,
            syntheseInput,
            1024
          );
          kostenEur += k;
          voorstellen = parseJsonArray<Kandidaat>(text).slice(0, MAX_VOORSTELLEN);
        }

        // Wegschrijven als 'voorgesteld'. De unique index vangt resterende
        // duplicaten; die tellen dan gewoon niet mee.
        let geplaatst = 0;
        for (const v of voorstellen) {
          const inhoud = (v.inhoud || "").trim().slice(0, 300);
          if (!inhoud) continue;
          let onderwerpType: "klant" | "algemeen" = v.onderwerp_type === "klant" ? "klant" : "algemeen";
          let onderwerpId: string | null = null;
          if (onderwerpType === "klant" && v.klant_naam) {
            const naam = v.klant_naam.trim().toLowerCase();
            const matches = (klanten ?? []).filter(
              (k) => (k.bedrijfsnaam as string).toLowerCase() === naam
            );
            if (matches.length === 1) onderwerpId = matches[0].id as string;
            else onderwerpType = "algemeen";
          }
          const { error } = await supabase.from("ai_geheugen").insert({
            organisatie_id: orgId,
            user_id: null,
            onderwerp_type: onderwerpType,
            onderwerp_id: onderwerpId,
            inhoud,
            status: "voorgesteld",
            agent: "nachtploeg",
            ronde_id: ronde.id,
            bewijs: {
              klant_naam: v.klant_naam ?? null,
              sporen: (sporen as Spoor[]).length,
              agents: [...new Set((sporen as Spoor[]).map((s) => s.agent))],
            },
          });
          if (!error) geplaatst++;
        }

        // Sporen afvinken en de ronde afronden.
        await supabase
          .from("ai_sporen")
          .update({ verwerkt_in_ronde: ronde.id })
          .in("id", (sporen as Spoor[]).map((s) => s.id));
        await supabase
          .from("ai_rondes")
          .update({
            status: "klaar",
            voorstellen: geplaatst,
            kosten_eur: Number(kostenEur.toFixed(4)),
            klaar_op: new Date().toISOString(),
          })
          .eq("id", ronde.id);

        rondes++;
        logger.info("Ronde klaar", { orgId, sporen: sporen.length, voorstellen: geplaatst, kostenEur });
      } catch (e) {
        await supabase
          .from("ai_rondes")
          .update({
            status: "mislukt",
            fout: String(e).slice(0, 500),
            kosten_eur: Number(kostenEur.toFixed(4)),
            klaar_op: new Date().toISOString(),
          })
          .eq("id", ronde.id);
        logger.error("Ronde mislukt", { orgId, fout: String(e) });
      }
    }

    return { rondes, overgeslagen, organisaties: orgIds.length };
  },
});
