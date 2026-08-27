# DMARC naar handhaving

Opgezocht op 27 augustus 2026 met `dig`. Controleer de stand opnieuw voordat je
een stap zet; DNS verandert buiten deze repo om.

## Wat er nu staat

**signcompany.nl** (afzender van de nieuwsbrief)

| Record | Waarde | Oordeel |
|---|---|---|
| SPF apex | `v=spf1 a mx include:_spf.google.com include:_spf.wpcloud.com ~all` | goed |
| SPF `send.` | `v=spf1 include:amazonses.com ~all` | goed, dit is Resend |
| MX `send.` | `feedback-smtp.eu-west-1.amazonses.com` | goed, bounces komen aan |
| DKIM `resend._domainkey` | aanwezig | goed |
| DMARC | `v=DMARC1;p=none` | **geen `rua`, dus geen rapporten** |

**doen.team** (de rest van de app)

| Record | Waarde | Oordeel |
|---|---|---|
| SPF apex | ontbreekt | **geen SPF-beleid** |
| SPF `send.` | `v=spf1 a mx include:spf.mijndomeinhosting.nl include:spf.improvmx.com ~all` | **fout: `include:amazonses.com` ontbreekt** |
| MX `send.` | `feedback-smtp.eu-west-1.amazonses.com` | goed, dit is Resend |
| DKIM `resend._domainkey` | aanwezig | goed |
| DMARC | `v=DMARC1; p=none; sp=none; pct=100; adkim=r; aspf=r; rua=mailto:dmarc@reportdmarc.nl; …` | standaard van mijndomein |

Post gaat nu nog door DMARC heen op DKIM alleen. Dat werkt, maar het is één
been in plaats van twee: valt de DKIM-sleutel ooit weg of herschrijft een
tussenstation de mail, dan is er geen tweede controle die hem opvangt.

`send.doen.team` is een echt record en geen wildcard van de provider. Een
willekeurig subdomein geeft niets terug, dus dit is bij het opzetten van Resend
verkeerd ingevuld of later overschreven.

## De volgorde

Niet naar `p=quarantine` springen. Zonder rapporten weet je niet wat je
tegenhoudt, en tegengehouden post ziet niemand: hij verdwijnt in een spammap of
wordt geweigerd, zonder dat jij het merkt.

### 1. Rapporten aanzetten (nu, geen risico)

Op `_dmarc.signcompany.nl`, TXT:

```
v=DMARC1; p=none; rua=mailto:dmarc@signcompany.nl; fo=1; pct=100
```

`p=none` blijft staan, er verandert dus niets aan de bezorging. Het enige
verschil is dat ontvangende partijen dagrapporten gaan sturen. Zorg dat
`dmarc@signcompany.nl` bestaat en gelezen wordt; het worden XML-bijlagen, dus
een verzamelmailbox of een verwerker is prettiger dan je eigen postvak.

Wijst `rua` naar een ander domein, dan heb je daar een extra autorisatierecord
voor nodig. Op hetzelfde domein blijven scheelt dat gedoe.

### 2. SPF van `send.doen.team` repareren (nu)

Op `send.doen.team`, TXT, vervang de huidige waarde door:

```
v=spf1 include:amazonses.com ~all
```

Dit subdomein is alleen het retourpad van Resend. De insluitingen van
mijndomein en improvmx horen daar niet; die gaan over post die via het
hoofddomein loopt.

### 3. Vier weken kijken

Lees de rapporten. Je zoekt naar afzenders die je niet herkent, en vooral naar
post die je wél zelf verstuurt maar die faalt. Denk aan een boekhoudpakket, een
formulier op de site, een nieuwsbriefdienst van vroeger, of doorgestuurde post.
Elke bron die je gaat handhaven zonder hem eerst te herkennen, valt bij stap 4
om.

### 4. Stapsgewijs handhaven

Pas na stap 3, en alleen als de rapporten schoon zijn:

```
v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@signcompany.nl; fo=1
```

Daarna `pct=50`, `pct=100`, en pas veel later `p=reject`. Tussen elke stap
minstens een week, en elke keer de rapporten opnieuw lezen. `pct` bepaalt op
welk deel van de post het beleid wordt toegepast, dus een fout raakt eerst een
kwart in plaats van alles.

### 5. Apex-SPF van doen.team, met zorg

`doen.team` heeft geen SPF. Dat is nu geen probleem omdat het domein niet
handhaaft, maar zodra je dat wel doet is het er wel een. Zet er pas een neer
als je hebt uitgeschreven wat er allemaal vanaf `@doen.team` verstuurt:
improvmx staat op de inkomende MX, en de app zelf gaat via `send.doen.team`.
Een onvolledige SPF is onder handhaving schadelijker dan geen SPF, want dan
valt je eigen post om.

## Wat dit met de nieuwsbrief te maken heeft

Koude post naar een branchelijst levert meer bounces en spamklachten op dan
post aan klanten. Die tellen mee in je reputatie op signcompany.nl, en dat is
hetzelfde domein waarmee je je klanten mailt. Handhaving en rapportage zijn wat
je merkt wanneer dat misgaat, in plaats van het achteraf te raden.

De module vangt de gevolgen al deels op: harde bounces en klachten belanden in
`nieuwsbrief_adres_problemen` en worden bij een volgende verzending
overgeslagen. Dat werkt pas nadat het een keer is misgegaan. Beginnen met een
klein deel van de lijst is de goedkopere les.
