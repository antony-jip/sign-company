"""Maakt public/_review/index.html met alle ruwe beelden, om te keuren in de browser.
Gebruik: python3 scripts/beeld-review.py  →  http://localhost:3000/_review/"""
import pathlib, shutil
from PIL import Image
bron = pathlib.Path("scratch/fotos-ruw"); doel = pathlib.Path("public/_review"); doel.mkdir(exist_ok=True)
kaarten = []
for f in sorted(bron.glob("*.jpg")):
    try:
        im = Image.open(f); im.load()
    except OSError:
        continue
    im.thumbnail((1600, 1600)); im.save(doel / f.name, quality=80)
    kaarten.append(f'<figure><img src="/_review/{f.name}" loading="lazy"><figcaption>{f.stem}</figcaption></figure>')
(doel / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Beeldreview</title>
<style>body{{margin:0;background:#0D343C;color:#E2F0F1;font:15px Helvetica,Arial}}h1{{padding:24px 32px 0;font-weight:600}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:24px;padding:24px 32px}}
figure{{margin:0}}img{{width:100%;display:block;border-radius:8px}}figcaption{{padding:8px 2px;opacity:.75}}</style>
<h1>Beeldreview · {len(kaarten)} beelden (ongegradeerd)</h1><div class="g">{''.join(kaarten)}</div>""")
print(len(kaarten))
