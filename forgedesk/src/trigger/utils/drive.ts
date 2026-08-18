import crypto from "node:crypto";

/**
 * Google Drive via een service-account.
 *
 * Waarom een service-account en geen inlog: het archief staat in een gedeelde
 * schijf, en daar is de organisatie eigenaar van de opslag. Een service-account
 * mag daar in schrijven zodra de schijf met zijn e-mailadres gedeeld is —
 * geen OAuth-scherm, geen tokens die verlopen, geen Google-verificatie van de
 * app. In een persoonlijke "Mijn Drive" zou dit niet werken: daar wordt het
 * service-account eigenaar van de bestanden en die heeft geen eigen opslag.
 *
 * Bewust met fetch tegen de REST-API in plaats van de googleapis-bibliotheek:
 * dat is een dependency van tientallen megabytes voor vier aanroepen.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive";
const MAP_MIME = "application/vnd.google-apps.folder";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface DriveBestand {
  id: string;
  name: string;
  size?: string;
}

function leesServiceAccount(): ServiceAccount | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as Partial<ServiceAccount>;
      if (parsed.client_email && parsed.private_key) {
        // In omgevingsvariabelen staan de regeleindes van de sleutel vaak als
        // letterlijke \n; zonder deze omzetting weigert crypto de sleutel.
        return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, "\n") };
      }
    } catch {
      return null;
    }
    return null;
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) return null;
  return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
}

export function driveGeconfigureerd(): boolean {
  return leesServiceAccount() !== null;
}

function base64url(waarde: Buffer | string): string {
  return Buffer.from(waarde).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let tokenCache: { token: string; verlooptOp: number } | null = null;

/** Toegangstoken voor de Drive-API; wordt hergebruikt tot een minuut voor het verloopt. */
export async function haalDriveToken(): Promise<string> {
  if (tokenCache && tokenCache.verlooptOp > Date.now() + 60_000) return tokenCache.token;

  const account = leesServiceAccount();
  if (!account) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON ontbreekt");

  const nu = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nu,
    exp: nu + 3600,
  }));

  const handtekening = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claim}`)
    .sign(account.private_key);
  const jwt = `${header}.${claim}.${base64url(handtekening)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Drive-token ophalen mislukt (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, verlooptOp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** Enkele quotes en backslashes breken de zoekopdracht van de Drive-API. */
function ontsnap(waarde: string): string {
  return waarde.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Drive accepteert bijna elke naam, maar een schuine streep leest in een
 * mappenpad als een niveau erbij en zorgt voor verwarring in de weergave.
 */
export function schoneNaam(naam: string): string {
  const schoon = naam.replace(/[/\\]+/g, "-").replace(/\s+/g, " ").trim();
  return schoon.slice(0, 120) || "naamloos";
}

const GEDEELDE_SCHIJF = "supportsAllDrives=true&includeItemsFromAllDrives=true";

async function driveGet(pad: string, token: string): Promise<Response> {
  return fetch(`https://www.googleapis.com/drive/v3/${pad}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
}

/** Zoekt een submap op naam. Null als hij er niet is. */
export async function zoekMap(token: string, naam: string, ouderId: string): Promise<DriveBestand | null> {
  const q = `'${ontsnap(ouderId)}' in parents and mimeType='${MAP_MIME}' and trashed=false and name='${ontsnap(schoneNaam(naam))}'`;
  const res = await driveGet(`files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=2&${GEDEELDE_SCHIJF}`, token);
  if (!res.ok) throw new Error(`Drive zoeken mislukt (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json() as { files?: DriveBestand[] };
  return data.files?.[0] ?? null;
}

export async function maakMap(token: string, naam: string, ouderId: string): Promise<DriveBestand> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: schoneNaam(naam), mimeType: MAP_MIME, parents: [ouderId] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Drive map aanmaken mislukt (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return await res.json() as DriveBestand;
}

/** Alle bestanden met deze naam in de map; nodig om dubbelingen te herkennen. */
export async function zoekBestanden(token: string, naam: string, ouderId: string): Promise<DriveBestand[]> {
  const q = `'${ontsnap(ouderId)}' in parents and trashed=false and name='${ontsnap(naam)}'`;
  const res = await driveGet(`files?q=${encodeURIComponent(q)}&fields=files(id,name,size)&pageSize=100&${GEDEELDE_SCHIJF}`, token);
  if (!res.ok) throw new Error(`Drive zoeken mislukt (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = await res.json() as { files?: DriveBestand[] };
  return data.files ?? [];
}

/**
 * Een vrije naam in de map.
 *
 * Twee klanten sturen allebei "logo.pdf" en dan zou de tweede de eerste
 * onzichtbaar maken — Drive staat namelijk twee bestanden met dezelfde naam
 * gewoon toe, dus het wordt niet overschreven maar wél onvindbaar. Staat er
 * al een bestand met dezelfde naam én dezelfde grootte, dan is het hetzelfde
 * bestand en hoeft er niets bij.
 */
export function kiesVrijeNaam(
  naam: string,
  grootte: number | null,
  bestaand: DriveBestand[],
): { naam: string } | { alAanwezig: DriveBestand } {
  if (bestaand.length === 0) return { naam };

  if (grootte != null) {
    const zelfde = bestaand.find((b) => b.size != null && Number(b.size) === grootte);
    if (zelfde) return { alAanwezig: zelfde };
  }

  const punt = naam.lastIndexOf(".");
  const stam = punt > 0 ? naam.slice(0, punt) : naam;
  const ext = punt > 0 ? naam.slice(punt) : "";
  const bezet = new Set(bestaand.map((b) => b.name));
  for (let i = 2; i < 100; i++) {
    const kandidaat = `${stam} (${i})${ext}`;
    if (!bezet.has(kandidaat)) return { naam: kandidaat };
  }
  return { naam: `${stam} (${Date.now()})${ext}` };
}

/**
 * Upload in twee stappen (resumable). Dat is omslachtiger dan een enkele
 * multipart-post, maar bijlagen in deze branche zijn regelmatig tientallen
 * megabytes aan drukwerk en daar loopt de eenvoudige route op stuk.
 */
export async function uploadNaarDrive(
  token: string,
  bestand: { naam: string; mimeType: string; ouderId: string; data: Blob },
): Promise<DriveBestand> {
  const start = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": bestand.mimeType || "application/octet-stream",
        "X-Upload-Content-Length": String(bestand.data.size),
      },
      body: JSON.stringify({ name: bestand.naam, parents: [bestand.ouderId] }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!start.ok) {
    throw new Error(`Drive upload starten mislukt (${start.status}): ${(await start.text()).slice(0, 300)}`);
  }
  const uploadUrl = start.headers.get("location");
  if (!uploadUrl) throw new Error("Drive gaf geen upload-URL terug");

  const klaar = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": bestand.mimeType || "application/octet-stream" },
    body: bestand.data,
    // Een groot bestand over een trage lijn mag de ronde niet ophangen, maar
    // vijf minuten is ruim genoeg voor wat hier langskomt.
    signal: AbortSignal.timeout(300_000),
  });

  if (!klaar.ok) {
    throw new Error(`Drive upload mislukt (${klaar.status}): ${(await klaar.text()).slice(0, 300)}`);
  }
  return await klaar.json() as DriveBestand;
}

/**
 * Map zoeken, en aanmaken als hij er niet is. Geeft null terug als hij
 * ontbreekt en aanmaken niet mag.
 */
export async function vindOfMaakMap(
  token: string,
  naam: string,
  ouderId: string,
  magAanmaken: boolean,
): Promise<DriveBestand | null> {
  const gevonden = await zoekMap(token, naam, ouderId);
  if (gevonden) return gevonden;
  if (!magAanmaken) return null;
  return await maakMap(token, naam, ouderId);
}

/** Alle submappen van een map. Doorloopt de paginering van de Drive-API. */
export async function lijstMappen(token: string, ouderId: string): Promise<DriveBestand[]> {
  const q = `'${ontsnap(ouderId)}' in parents and mimeType='${MAP_MIME}' and trashed=false`;
  const alles: DriveBestand[] = [];
  let pageToken: string | undefined;

  do {
    const paginaDeel = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const res = await driveGet(
      `files?q=${encodeURIComponent(q)}&fields=nextPageToken,files(id,name)&pageSize=1000&${GEDEELDE_SCHIJF}${paginaDeel}`,
      token,
    );
    if (!res.ok) throw new Error(`Drive mappen opsommen mislukt (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const data = await res.json() as { files?: DriveBestand[]; nextPageToken?: string };
    alles.push(...(data.files ?? []));
    pageToken = data.nextPageToken;
    // Een archief van tienduizend klantmappen bestaat niet; loopt dit vol,
    // dan wijst de hoofdmap ergens verkeerd heen.
  } while (pageToken && alles.length < 10_000);

  return alles;
}

const RECHTSVORMEN = new Set([
  "bv", "b", "v", "nv", "vof", "cv", "eenmanszaak", "holding",
  "as", "ab", "aps", "oy", "sa", "sas", "srl", "spa", "gmbh", "ag", "kg",
  "ltd", "limited", "llc", "inc", "plc", "corp", "co", "company", "group", "groep",
]);

/**
 * Bedrijfsnaam terugbrengen tot waar het om gaat, zodat "ColliCare Logistics AS"
 * en de bestaande map "Collicare logistics" elkaar vinden.
 *
 * Dit is nadrukkelijk alleen bedoeld om een BESTAANDE map te herkennen. Wie
 * hierop een nieuwe map zou aanmaken, maakt een map met een uitgeklede naam;
 * aanmaken gebeurt daarom altijd met de echte bedrijfsnaam.
 */
export function normaliseerBedrijfsnaam(naam: string): string {
  return naam
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((woord) => woord && !RECHTSVORMEN.has(woord))
    .join(" ")
    .trim();
}

/**
 * De klantmap tussen bestaande mappen zoeken.
 *
 * Bij twijfel — meer dan één map die op dezelfde naam uitkomt — kiest hij
 * niets. Een bestand in de verkeerde klantmap is erger dan een bestand dat
 * blijft staan met de melding dat iemand even moet kijken.
 */
export function kiesKlantMap(bedrijfsnaam: string, mappen: DriveBestand[]):
  | { gevonden: DriveBestand }
  | { onduidelijk: DriveBestand[] }
  | { geen: true } {
  const doel = normaliseerBedrijfsnaam(bedrijfsnaam);
  if (!doel) return { geen: true };

  const exact = mappen.filter((m) => m.name === bedrijfsnaam);
  if (exact.length === 1) return { gevonden: exact[0] };

  const treffers = mappen.filter((m) => normaliseerBedrijfsnaam(m.name) === doel);
  if (treffers.length === 1) return { gevonden: treffers[0] };
  if (treffers.length > 1) return { onduidelijk: treffers };
  return { geen: true };
}
