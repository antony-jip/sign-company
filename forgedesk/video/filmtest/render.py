"""Rendert de animatic naar mp4 door Chromium via CDP frame voor frame te zetten.

Geen puppeteer/playwright (npm is dicht), dus een minimale WebSocket-client op
stdlib. Beelden gaan als JPEG rechtstreeks de stdin van ffmpeg in; 1800 PNG's op
schijf zetten past niet binnen de schijfruimte van deze sessie.
"""
import base64, json, os, random, socket, struct, subprocess, sys, time, urllib.request

# Viewport ruim hoger dan de film: de pagina blijft heel, we knippen de stage eruit.
BREEDTE, HOOGTE, FPS, FRAMES = 1920, 2600, 24, 1800
S = os.path.dirname(os.path.abspath(__file__))
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
FFMPEG = "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux"
UIT = sys.argv[1] if len(sys.argv) > 1 else f"{S}/een-dag.webm"
POORT = 9333


class WS:
    """Genoeg WebSocket voor CDP: tekstframes heen, gefragmenteerde frames terug."""

    def __init__(self, url):
        _, rest = url.split("://", 1)
        hostpoort, pad = rest.split("/", 1)
        host, poort = hostpoort.split(":")
        self.s = socket.create_connection((host, int(poort)))
        self.s.settimeout(120)
        sleutel = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        self.s.sendall(
            f"GET /{pad} HTTP/1.1\r\nHost: {hostpoort}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {sleutel}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n".encode()
        )
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.rest = buf.split(b"\r\n\r\n", 1)[1]
        self.id = 0

    def _lees(self, n):
        while len(self.rest) < n:
            brok = self.s.recv(max(65536, n - len(self.rest)))
            if not brok:
                raise ConnectionError("socket dicht")
            self.rest += brok
        uit, self.rest = self.rest[:n], self.rest[n:]
        return uit

    def stuur(self, methode, params=None):
        self.id += 1
        lading = json.dumps({"id": self.id, "method": methode, "params": params or {}}).encode()
        kop = bytearray([0x81])
        n = len(lading)
        if n < 126:
            kop.append(0x80 | n)
        elif n < 65536:
            kop.append(0x80 | 126); kop += struct.pack(">H", n)
        else:
            kop.append(0x80 | 127); kop += struct.pack(">Q", n)
        masker = bytes(random.getrandbits(8) for _ in range(4))
        kop += masker
        self.s.sendall(bytes(kop) + bytes(b ^ masker[i % 4] for i, b in enumerate(lading)))
        return self.id

    def _frame(self):
        b0, b1 = self._lees(2)
        fin, op, n = b0 & 0x80, b0 & 0x0F, b1 & 0x7F
        if n == 126:
            n = struct.unpack(">H", self._lees(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", self._lees(8))[0]
        return fin, op, self._lees(n)

    def antwoord(self, wacht_id):
        """Leest tot het antwoord met dit id binnen is; events worden overgeslagen."""
        while True:
            fin, op, lading = self._frame()
            while not fin:
                fin, _, extra = self._frame()
                lading += extra
            if op == 9:  # ping
                continue
            if op == 8:
                raise ConnectionError("close")
            bericht = json.loads(lading)
            if bericht.get("id") == wacht_id:
                if "error" in bericht:
                    raise RuntimeError(bericht["error"])
                return bericht.get("result", {})

    def roep(self, methode, params=None):
        r = self.antwoord(self.stuur(methode, params))
        if "exceptionDetails" in r:
            raise RuntimeError(json.dumps(r["exceptionDetails"], indent=1)[:1600])
        return r


chrome = subprocess.Popen(
    [CHROME, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
     "--incognito", f"--user-data-dir=/tmp/ccr-chrome-{int(time.time())}",
     "--force-device-scale-factor=1", "--disable-lcd-text",
     f"--remote-debugging-port={POORT}", f"--window-size={BREEDTE},{HOOGTE}",
     f"file://{S}/preview.html?v={int(time.time()*1000)}"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

doel = None
for _ in range(60):
    time.sleep(0.5)
    try:
        lijst = json.load(urllib.request.urlopen(f"http://127.0.0.1:{POORT}/json"))
        doel = next((t for t in lijst if t["type"] == "page"), None)
        if doel:
            break
    except Exception:
        pass
if not doel:
    chrome.kill(); sys.exit("chrome kwam niet op")

ws = WS(doel["webSocketDebuggerUrl"])
ws.roep("Page.enable")
ws.roep("Runtime.enable")
ws.roep("Emulation.setDeviceMetricsOverride",
        {"width": BREEDTE, "height": HOOGTE, "deviceScaleFactor": 1, "mobile": False})
def fonts_klaar():
    r = ws.roep("Runtime.evaluate", {
        "expression": "document.fonts.ready.then(()=>["
                      "document.fonts.check('800 100px \"Bricolage Grotesque\"'),"
                      "document.fonts.check('500 20px \"DM Mono\"'),"
                      "document.fonts.check('400 20px Inter')].join(','))",
        "awaitPromise": True})
    return str(r.get("result", {}).get("value", ""))

for poging in range(40):
    stand = fonts_klaar()
    if stand == "true,true,true":
        break
    time.sleep(0.5)
print(f"  fonts: {stand}", flush=True)
if stand != "true,true,true":
    chrome.kill(); sys.exit("webfonts niet geladen (Bricolage,DM Mono,Inter); render zou in fallback staan")

# Alles behalve de stage weg, zodat het frame precies de film is.
ws.roep("Runtime.evaluate", {"expression": """(() => {
  // Zo min mogelijk aanraken. Alleen de shot-badge weg (die hoort niet in de
  // film) en de stage op filmbreedte; de rest van de pagina laten we staan en
  // knippen we er met clip buiten. Elementen weghalen brak teken().
  document.querySelectorAll('.shotmerk').forEach(e => { e.style.display = 'none'; });
  const w = document.querySelector('.wrap');
  w.style.maxWidth = 'none'; w.style.padding = '0'; w.style.gap = '0';
  document.body.style.background = '#000';
  const el = document.getElementById('stage');
  el.style.width = '1920px'; el.style.borderRadius = '0'; el.style.border = 'none';
  return 'ok';
})()"""})
r = ws.roep("Runtime.evaluate", {"expression": "typeof zetFrame + ',' + typeof teken"})
if "function" not in str(r.get("result", {}).get("value", "")):
    chrome.kill(); sys.exit(f"pagina-API niet bereikbaar: {r}")

rect = ws.roep("Runtime.evaluate", {
    "expression": "(() => {const r = document.getElementById('stage').getBoundingClientRect();"
                  "return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),"
                  "w:Math.round(r.width),h:Math.round(r.height)});})()"})
vak = json.loads(rect["result"]["value"])
# yuv420p wil even afmetingen
vak["w"] -= vak["w"] % 2
vak["h"] -= vak["h"] % 2
print(f"  stage {vak['w']}x{vak['h']} op ({vak['x']},{vak['y']})", flush=True)
if abs(vak["w"] / vak["h"] - 16 / 9) > 0.02:
    chrome.kill(); sys.exit(f"stage is geen 16:9 maar {vak['w']}x{vak['h']}")
KNIP = {"x": vak["x"], "y": vak["y"], "width": vak["w"], "height": vak["h"], "scale": 1}

ff = subprocess.Popen(
    # Deze ffmpeg is de uitgeklede build van Playwright: geen libx264, geen
    # mp4-muxer. Alleen image2pipe in, VP8 uit, WebM als container.
    [FFMPEG, "-y", "-f", "image2pipe", "-vcodec", "mjpeg", "-framerate", str(FPS), "-i", "pipe:0",
     "-c:v", "libvpx", "-b:v", "0", "-crf", "14", "-deadline", "good", "-cpu-used", "3",
     "-auto-alt-ref", "0", "-pix_fmt", "yuv420p", UIT],
    stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=open(f"{S}/ffmpeg.log","wb"))

start = time.time()
for f in range(FRAMES):
    ws.roep("Runtime.evaluate", {"expression": f"zetFrame({f});teken();"})
    shot = ws.roep("Page.captureScreenshot",
                   {"format": "jpeg", "quality": 92, "clip": KNIP,
                    "captureBeyondViewport": False})
    try:
        ff.stdin.write(base64.b64decode(shot["data"]))
    except BrokenPipeError:
        chrome.kill()
        sys.exit("ffmpeg stierf op frame %d:\n%s" % (f, open(f"{S}/ffmpeg.log").read()[-900:]))
    if f % 200 == 0:
        print(f"  frame {f}/{FRAMES}  {time.time()-start:.0f}s", flush=True)

ff.stdin.close()
ff.wait()
chrome.kill()
if ff.returncode != 0:
    sys.exit("ffmpeg faalde:\n" + open(f"{S}/ffmpeg.log").read()[-900:])
print(f"klaar in {time.time()-start:.0f}s -> {UIT}")
