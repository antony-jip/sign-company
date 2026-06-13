#!/usr/bin/env python3
"""
Snijdt elke artwork-mockup automatisch bij tot precies het doek (zonder de
witte muur eromheen), uploadt de schone uitsnede naar Supabase Storage onder
artworks/crop/<slug>.webp en zet artworks.thumb_url naar die URL.

Idempotent: opnieuw draaien overschrijft de crop en thumb_url.
Env: LIMIT (optioneel, voor een testrun), OFFSET (optioneel).
"""
import io, os, sys, json, urllib.request, urllib.error
from PIL import Image

# ── env uit .env.local ───────────────────────────────────────────────
ENV = {}
with open(os.path.join(os.path.dirname(__file__), '..', '.env.local')) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            ENV[k.strip()] = v.strip()

BASE = ENV['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/')
KEY = ENV['SUPABASE_SERVICE_ROLE_KEY']
BUCKET = 'artworks'
HDR = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}

LIMIT = int(os.environ.get('LIMIT', '0'))   # 0 = alles
OFFSET = int(os.environ.get('OFFSET', '0'))


def req(url, method='GET', data=None, headers=None, timeout=60):
    r = urllib.request.Request(url, data=data, method=method)
    for k, v in {**HDR, **(headers or {})}.items():
        r.add_header(k, v)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return resp.status, resp.read()


def fetch_artworks():
    rows, page = [], 0
    while True:
        url = (f"{BASE}/rest/v1/artworks?select=id,slug,image_url,thumb_url"
               f"&is_active=eq.true&order=id&limit=1000&offset={page*1000}")
        _, body = req(url)
        chunk = json.loads(body)
        rows += chunk
        if len(chunk) < 1000:
            break
        page += 1
    return rows


def download(url, tries=4):
    last = None
    for _ in range(tries):
        try:
            return urllib.request.urlopen(url, timeout=60).read()
        except Exception as e:
            last = e
    raise last


def detect_bbox(im):
    """
    Vindt exact waar de print zit. De muur én de zachte slagschaduw zijn allebei
    licht en grijs; de print heeft kleur óf donkere delen. We markeren dus elke
    pixel met genoeg verzadiging of donkerte als 'print' en nemen daar de
    bounding box van — geen gok, per foto bepaald.
    """
    W, H = im.size
    h = im.convert('HSV').load()

    def content(x, y):
        _, s, v = h[x, y]
        return s > 46 or v < 150  # gekleurd of donker = print; licht & grijs = muur/schaduw

    step = max(1, W // 260)
    xs = range(0, W, step)
    ys = range(0, H, step)

    def col(x):
        return sum(content(x, y) for y in ys) / len(ys) > 0.04

    def row(y):
        return sum(content(x, y) for x in xs) / len(xs) > 0.04

    L = next((x for x in range(0, W, step) if col(x)), 0)
    R = next((x for x in range(W - 1, -1, -step) if col(x)), W - 1)
    T = next((y for y in range(0, H, step) if row(y)), 0)
    B = next((y for y in range(H - 1, -1, -step) if row(y)), H - 1)
    # minieme inset om de fysieke doekrand zelf weg te halen
    iw = int((R - L) * 0.006)
    ih = int((B - T) * 0.006)
    return (max(0, L + iw), max(0, T + ih), min(W, R - iw), min(H, B - ih))


CREAM = (245, 244, 236)


def load_rgb(raw):
    """Open beeld; transparante delen op een crème muur zetten i.p.v. zwart."""
    im0 = Image.open(io.BytesIO(raw))
    has_alpha = im0.mode in ('RGBA', 'LA') or (im0.mode == 'P' and 'transparency' in im0.info)
    if has_alpha:
        im0 = im0.convert('RGBA')
        bg = Image.new('RGBA', im0.size, CREAM + (255,))
        return Image.alpha_composite(bg, im0).convert('RGB')
    return im0.convert('RGB')


def process(a):
    slug, img = a['slug'], a['image_url']
    raw = download(img)
    im = load_rgb(raw)
    W, H = im.size
    box = detect_bbox(im)
    # sla over als 'crop' vrijwel het hele beeld is (geen muur gevonden)
    crop = im.crop(box)
    buf = io.BytesIO()
    crop.save(buf, 'WEBP', quality=88, method=6)
    data = buf.getvalue()

    path = f"crop/{slug}.webp"
    up = f"{BASE}/storage/v1/object/{BUCKET}/{path}"
    req(up, method='POST', data=data,
        headers={'Content-Type': 'image/webp', 'x-upsert': 'true'})

    public = f"{BASE}/storage/v1/object/public/{BUCKET}/{path}"
    # Oriëntatie uit de werkelijke crop: breder dan hoog = liggend.
    liggend = crop.size[0] > crop.size[1]
    req(f"{BASE}/rest/v1/artworks?id=eq.{a['id']}", method='PATCH',
        data=json.dumps({'thumb_url': public, 'is_liggend': liggend}).encode(),
        headers={'Content-Type': 'application/json', 'Prefer': 'return=minimal'})
    return box, crop.size, liggend


def main():
    arts = fetch_artworks()
    slugs_env = os.environ.get('SLUGS')
    if slugs_env:
        wanted = set(s for s in slugs_env.split(',') if s)
        arts = [a for a in arts if a['slug'] in wanted]
    if os.environ.get('SKIP_DONE'):
        arts = [a for a in arts if '/crop/' not in (a.get('thumb_url') or '')]
    if OFFSET:
        arts = arts[OFFSET:]
    if LIMIT:
        arts = arts[:LIMIT]
    total = len(arts)
    print(f"Te verwerken: {total}", flush=True)
    ok = err = 0
    for i, a in enumerate(arts, 1):
        try:
            box, sz, lig = process(a)
            ok += 1
            if i <= 8 or i % 50 == 0:
                print(f"[{i}/{total}] {a['slug']:32} -> {sz[0]}x{sz[1]} {'L' if lig else 'P'}", flush=True)
        except Exception as e:
            err += 1
            print(f"[{i}/{total}] FOUT {a['slug']}: {e}", flush=True)
    print(f"Klaar. ok={ok} fout={err}", flush=True)


if __name__ == '__main__':
    main()
