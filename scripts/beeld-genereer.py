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

CAMERA = ("Candid documentary photograph, 35mm lens, f2.8, ISO 800, available light, "
          "slight film grain, imperfect framing, real unposed moment. Dutch setting, "
          "Dutch brick architecture, Dutch license plates. No text overlays.")

BEELDEN = {
  "hoogwerker-aan-de-gevel-breed": ("16:9",
    "Golden hour. Two sign fitters on an orange boom lift mounting the last letter of a large "
    "illuminated facade sign on a brick commercial building, the sign just switched on and glowing "
    "warm against the dusk sky. One fitter leans back and grins at the result. Street below with "
    "bikes and a white van. Wide composition, the sign in the right half."),
  "hoogwerker-aan-de-gevel": ("3:2",
    "Golden hour. Sign fitter on a boom lift tightening the last bolt of a glowing facade sign, "
    "warm light on his face, looking satisfied. Brick facade, low sun."),
  "ondernemer-aan-de-telefoon": ("16:7",
    "Owner of a small Dutch sign company, forties, standing on the pavement in front of a shop "
    "where his team just mounted a new illuminated sign, phone to his ear, smiling, other hand "
    "gesturing at the sign. Late afternoon sun, the shop owner visible in the doorway clapping. "
    "Wide cinematic crop."),
  "bus-inladen": ("16:7",
    "Early morning, low warm sunlight. Two sign fitters loading aluminium profiles and a rolled "
    "banner into a white van with fresh vehicle lettering, both laughing, energetic, steam from a "
    "coffee cup on the bumper. Dutch industrial estate. Wide cinematic crop."),
  "overleg-aan-de-werkbank": ("16:9",
    "Bright sign workshop, sunlight through roller door. A woman and a man in work clothes at a "
    "large cutting table, unrolling a freshly printed banner, both smiling at the print. Rolls of "
    "vinyl, a wide-format printer behind them. Energetic, proud."),
  "lichtbak-naar-de-winkel": ("16:9",
    "Two fitters carrying a finished light box sign across a Dutch shopping street towards a shop, "
    "shop owner holding the door open and beaming. Warm afternoon light, bikes parked, awnings."),
  "folie-op-de-bus": ("16:9",
    "Sign maker applying vinyl lettering to the side of a white van in a bright workshop, squeegee "
    "in hand, stepping back slightly to check alignment with a satisfied look. Warm overhead light, "
    "reflections on the van."),
  "kijken-of-het-staat": ("3:2",
    "Sign fitter standing on the pavement, arms folded, head tilted, looking up proudly at a just "
    "mounted facade sign. Golden hour, warm light on the brick. Colleague packing up the van."),
  "boren-in-de-gevel": ("3:2",
    "Close, energetic shot of a sign fitter drilling a mounting bracket into a brick facade from a "
    "ladder, brick dust in warm side light, focused expression."),
  "planning-op-het-bord": ("21:9",
    "Sign workshop office, morning sun. Two colleagues at a big weekly planning board, one pointing "
    "at Thursday, both upbeat, coffee mugs. Through the window the workshop and a van. Wide crop."),
  "werkbon-op-de-telefoon": ("21:9",
    "Sign fitter beside a brick facade checking his phone with a grin, tool bag at his feet, van "
    "behind him, freshly mounted sign above. Warm late light. Wide crop."),
  "prijs-uitrekenen": ("21:9",
    "Owner of a sign company at a tidy desk in a bright office, laptop open, material samples and "
    "a colour fan beside him, leaning back with a satisfied smile after finishing a quote. Workshop "
    "visible through glass. Wide crop."),
  "tekening-op-de-werkbank": ("21:9",
    "Two sign makers at a workbench measuring a large technical drawing with a folding rule, "
    "rolls of vinyl around, sunlight from a high window, engaged and enthusiastic. Wide crop."),
  "monster-tussen-de-mappen": ("3:2",
    "Hands holding a brushed aluminium letter sample up to the light in a sign workshop, warm "
    "light, shallow depth of field, colour swatches on the table."),
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
    namen = sys.argv[1:] or list(BEELDEN)
    for naam in namen:
        ar, p = BEELDEN[naam]
        gen(CAMERA + " " + p, ar, doel / f"{naam}.jpg")
        print("ok", naam)
