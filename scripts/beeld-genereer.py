"""
Nieuwe site-foto's via fal.ai (Imagen 4 Ultra), met energie en trots.

Gebruik:  FAL_AI_API_KEY=... python3 scripts/beeld-genereer.py [naam ...]
          (zonder namen: alle beelden hieronder)

Schrijft JPG's naar scratch/fotos-ruw/. Daarna:
  python3 scripts/beeld-grade.py scratch/fotos-ruw public/images/fotos 0.9 1800
  python3 scripts/beeld-energie.py public/images/fotos public/images/fotos 1.2

Richtlijn voor de prompts: geen regengrijs, geen ordners, geen gebogen
hoofden. Het moment van trots: de lichtbak die aangaat, de stap achteruit,
de klant die lacht, de bus die glimt. Gouden uur of warm werkplaatslicht.
Wel de cameragegevens en onvolkomenheden, anders wordt het een stockfoto.
"""
import os, sys, json, pathlib, urllib.request

# Eén serie, één lijn: dezelfde fotograaf, dezelfde ploeg, hetzelfde licht.
# Alles wat per beeld verschilt staat in BEELDEN; alles wat gelijk moet blijven hier.
CAMERA = ("Candid documentary photograph from one consistent editorial series. 35mm lens, f2.8, "
          "ISO 800, available light only, slight film grain, imperfect framing, real unposed moment. "
          "Same crew throughout: a small Dutch sign company, two or three fitters in plain dark navy "
          "work jackets and black work trousers, no logos. Same white panel van with subtle dark "
          "lettering. Same light throughout: late afternoon golden hour, low warm sun from the side, "
          "long soft shadows, clear sky. Colour palette: warm skin and sunlight against cool blue-teal "
          "shadows, muted, never oversaturated. Dutch setting, Dutch brick architecture, Dutch "
          "license plates. No text overlays, no watermarks.")

BEELDEN = {
  "hoogwerker-aan-de-gevel-breed": ("16:9",
    "Two sign fitters on an orange boom lift mounting the last letter of a large "
    "illuminated facade sign on a brick commercial building, the sign just switched on and glowing "
    "warm against the dusk sky. One fitter leans back and grins at the result. Street below with "
    "bikes and a white van. Wide composition, the sign in the right half."),
  "hoogwerker-aan-de-gevel": ("3:2",
    "Sign fitter on a boom lift tightening the last bolt of a glowing facade sign, "
    "warm light on his face, looking satisfied. Brick facade, low sun."),
  "ondernemer-aan-de-telefoon": ("16:7",
    "Owner of a small Dutch sign company, forties, standing on the pavement in front of a shop "
    "where his team just mounted a new illuminated sign, phone to his ear, smiling, other hand "
    "gesturing at the sign. The shop owner visible in the doorway clapping. "
    "Wide cinematic crop."),
  "bus-inladen": ("16:7",
    "Two sign fitters loading aluminium profiles and a rolled "
    "banner into a white van with fresh vehicle lettering, both laughing, energetic, steam from a "
    "coffee cup on the bumper. Dutch industrial estate. Wide cinematic crop."),
  "overleg-aan-de-werkbank": ("16:9",
    "Sign workshop with the roller door open, low sun streaming in. A woman and a man in work clothes at a "
    "large cutting table, unrolling a freshly printed banner, both smiling at the print. Rolls of "
    "vinyl, a wide-format printer behind them. Energetic, proud."),
  "lichtbak-naar-de-winkel": ("16:9",
    "Two fitters carrying a finished light box sign across a Dutch shopping street towards a shop, "
    "shop owner holding the door open and beaming. Bikes parked, awnings."),
  "folie-op-de-bus": ("16:9",
    "Sign maker applying vinyl lettering to the side of a white van in a bright workshop, squeegee "
    "in hand, stepping back slightly to check alignment with a satisfied look. Warm overhead light, "
    "reflections on the van."),
  "kijken-of-het-staat": ("3:2",
    "Sign fitter standing on the pavement, arms folded, head tilted, looking up proudly at a just "
    "mounted facade sign. Warm light on the brick. Colleague packing up the van."),
  "boren-in-de-gevel": ("3:2",
    "Close, energetic shot of a sign fitter drilling a mounting bracket into a brick facade from a "
    "ladder, brick dust in the low side light, focused expression."),
  "planning-op-het-bord": ("21:9",
    "Sign workshop office, low sun through the window. Two colleagues at a big weekly planning board, one pointing "
    "at Thursday, both upbeat, coffee mugs. Through the window the workshop and a van. Wide crop."),
  "werkbon-op-de-telefoon": ("21:9",
    "Sign fitter beside a brick facade checking his phone with a grin, tool bag at his feet, van "
    "behind him, freshly mounted sign above. Wide crop."),
  "prijs-uitrekenen": ("21:9",
    "Owner of a sign company at a tidy desk in a bright office, laptop open, material samples and "
    "a colour fan beside him, leaning back with a satisfied smile after finishing a quote. Workshop "
    "visible through glass. Wide crop."),
  "tekening-op-de-werkbank": ("21:9",
    "Two sign makers at a workbench measuring a large technical drawing with a folding rule, "
    "rolls of vinyl around, low sun from a high window, engaged and enthusiastic. Wide crop."),
  "monster-tussen-de-mappen": ("3:2",
    "Hands holding a brushed aluminium letter sample up to the light in a sign workshop, low sun, shallow depth of field, colour swatches on the table."),
}


# Pijler-foto's op de modulepagina's (3 per module). Liggend 4:3, gecropt
# naar de kaart. Eén moment per pijler, uit de werkdag van de ploeg.
PIJLERS = {
  # Projecten
  "p-projecten-actie": "Owner at a standing desk in the workshop tapping a tablet once with a grin, a finished sign leaning against the wall behind him.",
  "p-projecten-klant": "Shop owner in her doorway looking at her phone and smiling, the new sign above her just mounted, a fitter packing tools in the foreground.",
  "p-projecten-status": "Two fitters at the open van door checking a tablet together, nodding, job done, warm light on the brick street.",
  # Offertes
  "p-offertes-calculatie": "Owner measuring a shopfront with a laser measure, notebook in the other hand, low sun on the glass.",
  "p-offertes-marge": "Close on hands placing aluminium and acrylic samples on a shopfront drawing on the workbench, colour fan beside it.",
  "p-offertes-leverancier": "Fitter in the workshop unpacking a delivery of vinyl rolls, reading the label, pallets and the van behind him.",
  # Portaal
  "p-portaal-akkoord": "Client and sign maker shaking hands on the pavement in front of the new sign, both smiling, van parked behind.",
  "p-portaal-zien": "Client looking at a printed proof held up against the facade by a fitter, comparing, warm light.",
  "p-portaal-opvolgen": "Owner leaning against the van with a coffee, glancing at his phone, relaxed, street in golden light.",
  # Planning
  "p-planning-week": "Three fitters at the workshop door early, one pointing at a tablet, the others with coffee, vans ready behind them.",
  "p-planning-monteur": "Fitter in the driver seat of the van checking the day's job on his phone before pulling away, low sun through the windscreen.",
  "p-planning-weer": "Fitter on a boom lift platform looking up at a clearing sky, tightening a strap, the facade beside him.",
  # Werkbonnen
  "p-werkbonnen-maken": "Owner at the workshop table tearing a job off a roll of printed vinyl, the work order on a phone beside it.",
  "p-werkbonnen-locatie": "Fitter taking a photo with his phone of the freshly mounted letters, ladder beside him, satisfied.",
  "p-werkbonnen-tekenen": "Client signing on the fitter's phone with a finger, both standing by the van, the finished sign behind.",
  # Facturen
  "p-facturen-eenklik": "Owner closing a laptop at the end of the day in the office, workshop visible through glass, content.",
  "p-facturen-inkoop": "Stack of supplier delivery notes on the workbench next to a scanner phone, hands flipping through.",
  "p-facturen-exact": "Owner and bookkeeper at a table with one laptop, both relaxed, light through the office window.",
  # Studio
  "p-studio-input": "Sign maker photographing a blank shopfront with his phone from across the street, bikes passing.",
  "p-studio-project": "Tablet on the workbench showing a facade photo next to a real sample letter, hands comparing.",
  "p-studio-credits": "Designer at a bright desk showing a colleague a facade visualisation on screen, both leaning in.",
  # AI
  "p-ai-cijfers": "Owner on the workshop floor with a tablet, glancing at it between two jobs, printer running behind.",
  "p-ai-schrijft": "Owner typing a short message on his phone in the van cab, smiling, jobsite through the window.",
  "p-ai-rekent": "Hands with a folding rule on a large banner on the cutting table, phone with calculator beside it.",
  # Email
  "p-email-mailbox": "Owner at the office desk with a single screen, mug, sunlight, calm morning in the workshop office.",
  "p-email-gekoppeld": "Fitter handing a delivery note to the owner in the workshop, both glancing at the tablet on the bench.",
  "p-email-daan": "Owner reading his phone by the roller door with coffee, relaxed, van and sunlight behind.",
  # Taken
  "p-taken-werk": "Workshop whiteboard with sticky notes being replaced by a tablet held by the owner, colleague nearby.",
  "p-taken-deadline": "Two colleagues at the cutting table, one pointing at a date on a tablet, the other nodding.",
  "p-taken-niks": "End of day: fitter sweeping the workshop floor, all the vans back, warm light through the open door.",
}

def gen(prompt, ar, out):
    body = json.dumps({"prompt": prompt, "aspect_ratio": ar, "num_images": 1}).encode()
    req = urllib.request.Request(
        "https://fal.run/fal-ai/imagen4/preview/ultra", data=body,
        headers={"Authorization": "Key " + os.environ["FAL_AI_API_KEY"].strip('"'),
                 "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    urllib.request.urlretrieve(r["images"][0]["url"], out)

if __name__ == "__main__":
    doel = pathlib.Path("scratch/fotos-ruw"); doel.mkdir(parents=True, exist_ok=True)
    alles = {**BEELDEN, **{k: ("4:3", v) for k, v in PIJLERS.items()}}
    namen = sys.argv[1:] or list(alles)
    for naam in namen:
        if (doel / f"{naam}.jpg").exists():
            continue
        ar, p = alles[naam]
        gen(CAMERA + " " + p, ar, doel / f"{naam}.jpg")
        print("ok", naam)
