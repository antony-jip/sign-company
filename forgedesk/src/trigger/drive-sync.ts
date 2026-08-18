import { logger, schedules } from "@trigger.dev/sdk/v3";
import { getSupabaseAdmin } from "./utils/supabase";
import {
  driveGeconfigureerd,
  haalDriveToken,
  kiesKlantMap,
  kiesVrijeNaam,
  lijstMappen,
  maakMap,
  vindOfMaakMap,
  zoekBestanden,
  uploadNaarDrive,
  type DriveBestand,
} from "./utils/drive";

/**
 * Zet projectbestanden door naar de klantmap in de gedeelde schijf.
 *
 * De trigger uit migratie 218 schrijft elk nieuw projectdocument in
 * drive_sync_wachtrij; deze ronde werkt die rijen af. Mislukt er een, dan
 * blijft hij openstaan en gaat hij de volgende ronde opnieuw mee met een
 * oplopende wachttijd.
 *
 * De klantmap wordt één keer opgezocht en daarna onthouden op de klant, zodat
 * een hernoemde map in Drive de koppeling niet verbreekt.
 */

const BUCKET = "documenten-prive";
const MAX_POGINGEN = 5;
const PER_RONDE = 50;

interface WachtrijRij {
  id: string;
  document_id: string;
  organisatie_id: string | null;
  pogingen: number;
}

interface DocumentRij {
  id: string;
  naam: string;
  type: string | null;
  grootte: number | null;
  storage_path: string | null;
  project_id: string | null;
  klant_id: string | null;
  organisatie_id: string | null;
  drive_bestand_id: string | null;
}

interface OrgInstelling {
  actief: boolean;
  hoofdmapId: string | null;
  magAanmaken: boolean;
}

/** Wachttijd voor de volgende poging: 2, 4, 8, 16, 32 minuten. */
export function volgendePogingOver(pogingen: number): number {
  return Math.min(2 ** Math.max(1, pogingen), 32) * 60_000;
}

/**
 * Mapnaam van een project. Het projectnummer is de sleutel die iedereen hier
 * gebruikt; heeft een project er geen, dan valt hij terug op de naam.
 */
export function projectMapNaam(project: { project_nummer?: string | null; naam?: string | null }): string {
  const nummer = project.project_nummer?.trim();
  if (nummer) return nummer;
  return project.naam?.trim() || "Project";
}

export const driveSyncCron = schedules.task({
  id: "drive-sync-cron",
  cron: { pattern: "*/2 * * * *", timezone: "Europe/Amsterdam" },
  maxDuration: 600,
  run: async () => {
    if (!driveGeconfigureerd()) {
      logger.info("Drive-sync overgeslagen · geen service-account ingesteld");
      return { verwerkt: 0, gelukt: 0, overgeslagen: 0, mislukt: 0 };
    }

    const supabase = getSupabaseAdmin();

    const { data: rijen, error } = await supabase
      .from("drive_sync_wachtrij")
      .select("id, document_id, organisatie_id, pogingen")
      .eq("status", "open")
      .lte("volgende_poging", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(PER_RONDE);

    if (error) throw new Error(`Wachtrij lezen mislukt: ${error.message}`);
    if (!rijen || rijen.length === 0) return { verwerkt: 0, gelukt: 0, overgeslagen: 0, mislukt: 0 };

    const token = await haalDriveToken();

    // Per ronde onthouden: de instellingen van een organisatie en de
    // mappenlijst van een hoofdmap. Vijftig bestanden van dezelfde klant
    // moeten niet vijftig keer hetzelfde ophalen.
    const instellingCache = new Map<string, OrgInstelling>();
    const mappenCache = new Map<string, DriveBestand[]>();

    let gelukt = 0;
    let overgeslagen = 0;
    let mislukt = 0;

    for (const rij of rijen as WachtrijRij[]) {
      try {
        const uitkomst = await verwerkRij(supabase, token, rij, instellingCache, mappenCache);
        if (uitkomst === "klaar") gelukt++;
        else overgeslagen++;
      } catch (err) {
        const bericht = err instanceof Error ? err.message : String(err);
        const pogingen = rij.pogingen + 1;
        const opgegeven = pogingen >= MAX_POGINGEN;
        if (opgegeven) mislukt++;

        logger.error("Drive-sync mislukt", { documentId: rij.document_id, pogingen, fout: bericht });

        await supabase
          .from("drive_sync_wachtrij")
          .update({
            status: opgegeven ? "mislukt" : "open",
            pogingen,
            laatste_fout: bericht.slice(0, 500),
            volgende_poging: new Date(Date.now() + volgendePogingOver(pogingen)).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", rij.id);
      }
    }

    logger.info("Drive-sync ronde klaar", { verwerkt: rijen.length, gelukt, overgeslagen, mislukt });
    return { verwerkt: rijen.length, gelukt, overgeslagen, mislukt };
  },
});

type Uitkomst = "klaar" | "overgeslagen";

async function verwerkRij(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  token: string,
  rij: WachtrijRij,
  instellingCache: Map<string, OrgInstelling>,
  mappenCache: Map<string, DriveBestand[]>,
): Promise<Uitkomst> {
  const nu = () => new Date().toISOString();

  const markeer = async (status: "klaar" | "overgeslagen", reden: string | null, driveId: string | null = null) => {
    await supabase
      .from("drive_sync_wachtrij")
      .update({ status, laatste_fout: reden, drive_bestand_id: driveId, updated_at: nu() })
      .eq("id", rij.id);
  };

  const { data: doc } = await supabase
    .from("documenten")
    .select("id, naam, type, grootte, storage_path, project_id, klant_id, organisatie_id, drive_bestand_id")
    .eq("id", rij.document_id)
    .maybeSingle();

  const document = doc as DocumentRij | null;
  if (!document) {
    // Document is intussen verwijderd; de rij is dan zinloos geworden.
    await markeer("overgeslagen", "document bestaat niet meer");
    return "overgeslagen";
  }
  if (document.drive_bestand_id) {
    await markeer("klaar", null, document.drive_bestand_id);
    return "klaar";
  }
  if (!document.storage_path) {
    await markeer("overgeslagen", "geen bestand in opslag");
    return "overgeslagen";
  }

  const orgId = document.organisatie_id || rij.organisatie_id;
  if (!orgId) {
    await markeer("overgeslagen", "document hoort bij geen organisatie");
    return "overgeslagen";
  }

  const instelling = await haalInstelling(supabase, orgId, instellingCache);
  if (!instelling.actief || !instelling.hoofdmapId) {
    await markeer("overgeslagen", "Drive-koppeling staat uit voor deze organisatie");
    return "overgeslagen";
  }

  // ── Project en klant ophalen ──
  if (!document.project_id) {
    await markeer("overgeslagen", "document hangt niet aan een project");
    return "overgeslagen";
  }

  const { data: project } = await supabase
    .from("projecten")
    .select("id, naam, project_nummer, klant_id, drive_map_id")
    .eq("id", document.project_id)
    .maybeSingle();

  if (!project) {
    await markeer("overgeslagen", "project bestaat niet meer");
    return "overgeslagen";
  }

  const klantId = document.klant_id || (project.klant_id as string | null);
  if (!klantId) {
    await markeer("overgeslagen", "project heeft geen klant, dus geen klantmap");
    return "overgeslagen";
  }

  const { data: klant } = await supabase
    .from("klanten")
    .select("id, bedrijfsnaam, drive_map_id")
    .eq("id", klantId)
    .maybeSingle();

  if (!klant) {
    await markeer("overgeslagen", "klant bestaat niet meer");
    return "overgeslagen";
  }

  // ── Klantmap: onthouden id, anders zoeken tussen de bestaande mappen ──
  let klantMapId = klant.drive_map_id as string | null;
  if (!klantMapId) {
    const hoofdmapId = instelling.hoofdmapId;
    let mappen = mappenCache.get(hoofdmapId);
    if (!mappen) {
      mappen = await lijstMappen(token, hoofdmapId);
      mappenCache.set(hoofdmapId, mappen);
    }

    const keuze = kiesKlantMap(klant.bedrijfsnaam as string, mappen);
    if ("gevonden" in keuze) {
      klantMapId = keuze.gevonden.id;
    } else if ("onduidelijk" in keuze) {
      // Meerdere mappen die op dezelfde naam uitkomen. Zelf kiezen zou
      // betekenen dat er bestanden bij de verkeerde klant belanden.
      throw new Error(
        `Meerdere mappen lijken op "${klant.bedrijfsnaam}": ${keuze.onduidelijk.map((m) => m.name).join(", ")}. Koppel de juiste map handmatig.`,
      );
    } else if (instelling.magAanmaken) {
      const nieuw = await maakMap(token, klant.bedrijfsnaam as string, hoofdmapId);
      klantMapId = nieuw.id;
      mappen.push(nieuw);
      logger.info("Nieuwe klantmap aangemaakt", { klant: klant.bedrijfsnaam, mapId: nieuw.id });
    } else {
      await markeer("overgeslagen", `geen map gevonden voor "${klant.bedrijfsnaam}" en aanmaken staat uit`);
      return "overgeslagen";
    }

    await supabase.from("klanten").update({ drive_map_id: klantMapId }).eq("id", klant.id);
  }

  // ── Projectmap binnen de klantmap ──
  let projectMapId = project.drive_map_id as string | null;
  if (!projectMapId) {
    const map = await vindOfMaakMap(token, projectMapNaam(project), klantMapId, instelling.magAanmaken);
    if (!map) {
      await markeer("overgeslagen", "projectmap ontbreekt en aanmaken staat uit");
      return "overgeslagen";
    }
    projectMapId = map.id;
    await supabase.from("projecten").update({ drive_map_id: projectMapId }).eq("id", project.id);
  }

  // ── Bestand ophalen en uploaden ──
  const { data: blob, error: downloadFout } = await supabase.storage.from(BUCKET).download(document.storage_path);
  if (downloadFout || !blob) {
    throw new Error(`Bestand uit opslag halen mislukt: ${downloadFout?.message || "geen data"}`);
  }
  const bestaand = await zoekBestanden(token, document.naam, projectMapId);
  const keuze = kiesVrijeNaam(document.naam, blob.size, bestaand);

  let driveBestand: DriveBestand;
  if ("alAanwezig" in keuze) {
    // Zelfde naam én zelfde grootte: dit bestand staat er al.
    driveBestand = keuze.alAanwezig;
  } else {
    driveBestand = await uploadNaarDrive(token, {
      naam: keuze.naam,
      mimeType: document.type || "application/octet-stream",
      ouderId: projectMapId,
      data: blob,
    });
  }

  await supabase
    .from("documenten")
    .update({ drive_bestand_id: driveBestand.id, drive_gesynct_op: nu() })
    .eq("id", document.id);

  await markeer("klaar", null, driveBestand.id);
  return "klaar";
}

async function haalInstelling(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orgId: string,
  cache: Map<string, OrgInstelling>,
): Promise<OrgInstelling> {
  const gecached = cache.get(orgId);
  if (gecached) return gecached;

  // De org-rij van app_settings is leidend; die is bij de andere integraties
  // ook de plek waar de instellingen van het bedrijf staan.
  const { data } = await supabase
    .from("app_settings")
    .select("drive_actief, drive_hoofdmap_id, drive_map_aanmaken")
    .eq("organisatie_id", orgId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const instelling: OrgInstelling = {
    actief: !!data?.drive_actief,
    hoofdmapId: (data?.drive_hoofdmap_id as string | null) || null,
    magAanmaken: data?.drive_map_aanmaken !== false,
  };
  cache.set(orgId, instelling);
  return instelling;
}
