"""
De doen.-grade: neutraal geschoten beeld naar de merkkleur trekken.

Gebruik:  python3 scripts/beeld-grade.py <bronmap> <doelmap> [sterkte] [maxzijde]
Standaard voor de site is sterkte 1.5 en maxzijde 1800; daarna als webp
opslaan met kwaliteit 82.

Waarom een script en niet een filter per foto: zo krijgt elk nieuw beeld exact
dezelfde look, ook als er over een jaar iemand anders een foto toevoegt.

Het beeld zelf komt uit fal.ai op Imagen 4 Ultra. Vraag daar NOOIT om een koele
of filmische look, want dan krijg je de gladde AI-foto terug. Vraag om
cameragegevens (35mm, f2.8, ISO 800, beschikbaar licht), om onvolkomenheden
(ruis, lichte bewegingsonscherpte, scheve kadrering) en om Nederlandse details.
De kleur komt hier pas.
"""
import sys, pathlib
import numpy as np
from PIL import Image

PETROL = np.array([0x1A, 0x53, 0x5C], dtype=np.float64) / 255.0

def grade(pad_in, pad_uit, sterkte=1.0, kwaliteit=92, max_zijde=None):
    im = Image.open(pad_in).convert("RGB")
    if max_zijde and max(im.size) > max_zijde:
        f = max_zijde / max(im.size)
        im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
    x = np.asarray(im, dtype=np.float64) / 255.0

    # Luminantie bepaalt hoeveel van de tint waar landt.
    lum = x @ np.array([0.2126, 0.7152, 0.0722])
    schaduw = np.clip(1.0 - lum * 1.6, 0.0, 1.0)[..., None]
    hoog = np.clip((lum - 0.55) / 0.45, 0.0, 1.0)[..., None]

    # Verzadiging terug, maar niet vlak: het beeld moet nog kleur hebben.
    x = lum[..., None] + (x - lum[..., None]) * (1.0 - 0.18 * sterkte)

    # Schaduwen naar petrol, hoge lichten een graad koeler.
    x = x + (PETROL - 0.5) * 0.26 * sterkte * schaduw
    x = x + np.array([-0.020, 0.004, 0.026]) * sterkte * hoog

    # Zwarten optillen in dezelfde tint, anders valt de schaduw dicht.
    x = x * (1.0 - 0.045 * sterkte) + PETROL * 0.045 * sterkte

    # Lichte S-curve zodat het optillen niet als waas leest.
    x = np.clip(x, 0.0, 1.0)
    x = x + 0.10 * sterkte * (x - 0.5) * (1.0 - np.abs(x - 0.5) * 2.0)

    uit = Image.fromarray(np.clip(x, 0, 1).astype(np.float32).__mul__(255).astype(np.uint8))
    pad_uit = pathlib.Path(pad_uit)
    pad_uit.parent.mkdir(parents=True, exist_ok=True)
    uit.save(pad_uit, quality=kwaliteit, subsampling=1)

if __name__ == "__main__":
    bron, doel = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    sterkte = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    grens = int(sys.argv[4]) if len(sys.argv) > 4 else None
    for f in sorted(bron.glob("*.jpg")):
        grade(f, doel / f.name, sterkte, max_zijde=grens)
        print("gegradeerd:", f.name)
