"""
Warm-lift voor al gegradeerde site-foto's: het beeld mag weer ademen.

Gebruik:  python3 scripts/beeld-energie.py <bronmap> <doelmap> [sterkte]

Wat het doet: middentonen iets omhoog, verzadiging terug, een warme tint in
de hoge lichten (gouden uur in plaats van regengrijs) en de petrol blijft
alleen in de schaduw zitten. Bedoeld voor de webp's in public/images/fotos
waarvan de bron niet meer bestaat; nieuw beeld gaat eerst door beeld-grade.py
met sterkte 0.9 en dan hierdoor.
"""
import sys, pathlib
import numpy as np
from PIL import Image

WARM = np.array([0.045, 0.012, -0.040])

def lift(pad_in, pad_uit, sterkte=1.0, kwaliteit=84):
    im = Image.open(pad_in).convert("RGB")
    x = np.asarray(im, dtype=np.float64) / 255.0
    lum = x @ np.array([0.2126, 0.7152, 0.0722])
    hoog = np.clip((lum - 0.35) / 0.55, 0.0, 1.0)[..., None]
    midden = (1.0 - np.abs(lum - 0.5) * 2.0).clip(0, 1)[..., None]

    # Middentonen omhoog: contrast blijft, het beeld wordt minder zwaar.
    x = x + 0.08 * sterkte * midden
    # Verzadiging terug.
    l = x @ np.array([0.2126, 0.7152, 0.0722])
    x = l[..., None] + (x - l[..., None]) * (1.0 + 0.22 * sterkte)
    # Warmte in de hoge lichten.
    x = x + WARM * sterkte * hoog
    # Zachte S-curve voor pit.
    x = np.clip(x, 0, 1)
    x = x + 0.08 * sterkte * (x - 0.5) * (1.0 - np.abs(x - 0.5) * 2.0)

    uit = Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))
    pathlib.Path(pad_uit).parent.mkdir(parents=True, exist_ok=True)
    uit.save(pad_uit, quality=kwaliteit, method=6)

if __name__ == "__main__":
    bron, doel = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    sterkte = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    for f in sorted(bron.glob("*.webp")):
        lift(f, doel / f.name, sterkte)
        print("gelift:", f.name)
