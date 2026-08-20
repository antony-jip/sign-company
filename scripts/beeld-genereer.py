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
CAMERA = ("Unposed documentary photograph, shot on a Fujifilm X-T4 with a 35mm f/1.4 lens at f/2.8, "
          "ISO 640, natural daylight only, fine film grain, slight motion blur where people move, "
          "a little off-centre framing, nobody looking at the camera. Real Dutch sign company crew: "
          "two or three fitters in plain dark navy softshell jackets and black work trousers, worn "
          "work boots, no logos, ordinary faces, one in his fifties. Light: soft overcast-to-sunny Dutch afternoon, low "
          "warm sun breaking through, long soft shadows. Colour: honest, lightly desaturated, warm "
          "skin against cool blue-teal shadows, nothing glossy or advertising-like. No text overlays, no watermarks, "
          "Absolutely no words or letters anywhere in the image: not on the van, not on the building, "
          "not on clothing. Any signage is a simple geometric logo mark, or letter shapes still fully "
          "wrapped in opaque blue protective film so nothing can be read. People are the subject, framed from medium distance, "
          "not tiny figures in a wide architecture shot.")

BEELDEN = {
  "hoogwerker-aan-de-gevel-breed": ("16:9",
    "Two sign fitters on an orange boom lift at first-floor height, mounting large letters still "
    "wrapped in blue protective film onto a brick facade; one fitter leans back and grins at the "
    "result, the other tightens a bolt. Shot from the pavement, slightly below, the lift and the men "
    "fill the right half, the street with bikes and the white van on the left."),
  "hoogwerker-aan-de-gevel": ("3:2",
    "Sign fitter on a boom lift tightening the last bolt of a glowing facade sign, "
    "warm light on his face, looking satisfied. Brick facade, low sun."),
  "ondernemer-aan-de-telefoon": ("21:9",
    "Owner of a small Dutch sign company, forties, standing on the pavement in front of a shop "
    "where his team just mounted a new illuminated sign, phone to his ear, smiling, other hand "
    "gesturing at the sign. The shop owner visible in the doorway clapping. "
    "Wide cinematic crop."),
  "bus-inladen": ("21:9",
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
    "Owner at his desk in the workshop office working out a price, laptop open, material samples and a folding rule beside the papers, leaning back with a small satisfied smile, low sun through the window. Wide crop."),
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
  "p-offertes-marge": "Hands placing brushed aluminium and acrylic samples on a shopfront drawing on the workbench indoors, a colour fan beside it, daylight from a side window.",
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
  "p-werkbonnen-tekenen": "Close on a client signing with a finger on the phone screen of the fitter, both standing by the open van door, the finished sign wrapped in blue film behind them.",
  # Facturen
  "p-facturen-eenklik": "Owner closing a laptop at the end of the day in the office, workshop visible through glass, content.",
  "p-facturen-inkoop": "Close on a workbench indoors: a short stack of supplier delivery notes next to a phone, hands flipping through them, rolls of vinyl out of focus behind.",
  "p-facturen-exact": "Owner of the sign company and his bookkeeper at one table in a small office, one laptop between them, both relaxed, a folder closed, daylight from the window, the workshop visible through a glass wall.",
  # Studio
  "p-studio-input": "Sign maker photographing a blank shopfront with his phone from across the street, bikes passing.",
  "p-studio-project": "Tablet on the workbench indoors showing a facade photo, next to it a real brushed aluminium sample letter, two hands comparing them.",
  "p-studio-credits": "Designer at a bright desk showing a colleague a facade visualisation on screen, both leaning in.",
  # AI
  "p-ai-cijfers": "Owner on the workshop floor glancing at a tablet between two jobs, a wide-format printer running behind him, vinyl rolls in racks.",
  "p-ai-schrijft": "Owner typing a short message on his phone in the van cab, smiling, jobsite through the window.",
  "p-ai-rekent": "Hands with a folding rule on a large printed banner on the cutting table indoors, a phone with a calculator beside it.",
  # Email
  "p-email-mailbox": "Owner at his desk in the workshop office, one screen, a mug, morning light, calm, rolls of vinyl visible through the door behind him.",
  "p-email-gekoppeld": "Fitter handing a delivery note to the owner in the workshop, both glancing at the tablet on the bench.",
  "p-email-daan": "Owner reading his phone by the roller door with coffee, relaxed, van and sunlight behind.",
  # Taken
  "p-taken-werk": "Owner in the workshop office holding a tablet in front of an old whiteboard full of sticky notes, a colleague looking over his shoulder.",
  "p-taken-deadline": "Two colleagues at the cutting table in the workshop, one pointing at a date on a tablet, the other nodding, vinyl rolls behind them.",
  "p-taken-niks": "End of day: fitter sweeping the workshop floor, all the vans back, warm light through the open door.",
}

# Nano Banana 2 wint: volgt "geen tekst" op, echt Nederlands straatbeeld. FLUX Pro
# Ultra is scherper maar verzint woorden op elk bord en elke bus; Imagen 4 Ultra
# is op fal te vaak in storing.
MODEL = os.environ.get("BEELD_MODEL", "fal-ai/nano-banana-2")

BUITEN = ("Outdoors in a Dutch street: brick facades, Dutch street furniture, bikes, Dutch number plates, "
          "a completely plain white panel van without lettering or logo. ")
BINNEN = ("Indoors, no van and no street in the frame: the scene is the room itself, daylight through a "
          "window or an open roller door. ")

def gen(prompt, ar, out):
    body = {"prompt": prompt, "aspect_ratio": ar, "num_images": 1}
    if "flux-pro" in MODEL:
        body.update({"raw": True, "safety_tolerance": "5", "output_format": "jpeg"})
    if "nano-banana" in MODEL:
        body.update({"resolution": "2K", "output_format": "jpeg"})
    body = json.dumps(body).encode()
    req = urllib.request.Request(
        f"https://fal.run/{MODEL}", data=body,
        headers={"Authorization": "Key " + os.environ["FAL_AI_API_KEY"].strip('"'),
                 "Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=300))
    urllib.request.urlretrieve(r["images"][0]["url"], out)

BINNEN_SET = set(['overleg-aan-de-werkbank', 'monster-tussen-de-mappen', 'planning-op-het-bord', 'prijs-uitrekenen', 'tekening-op-de-werkbank', 'folie-op-de-bus', 'p-projecten-actie', 'p-offertes-marge', 'p-offertes-leverancier', 'p-werkbonnen-maken', 'p-facturen-eenklik', 'p-facturen-inkoop', 'p-facturen-exact', 'p-studio-project', 'p-studio-credits', 'p-ai-cijfers', 'p-ai-rekent', 'p-email-mailbox', 'p-email-gekoppeld', 'p-taken-werk', 'p-taken-deadline', 'p-taken-niks'])

if __name__ == "__main__":
    doel = pathlib.Path("scratch/fotos-ruw"); doel.mkdir(parents=True, exist_ok=True)
    alles = {**BEELDEN, **{k: ("4:3", v) for k, v in PIJLERS.items()}}
    namen = sys.argv[1:] or list(alles)
    for naam in namen:
        if (doel / f"{naam}.jpg").exists():
            continue
        ar, p = alles[naam]
        plek = BINNEN if naam in BINNEN_SET else BUITEN
        gen(CAMERA + " " + plek + p, ar, doel / f"{naam}.jpg")
        print("ok", naam)
