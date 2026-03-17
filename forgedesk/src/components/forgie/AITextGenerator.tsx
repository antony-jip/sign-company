import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react'
import { isAIConfigured, generateText } from '@/services/aiService'
import { toast } from 'sonner'

type TemplateType =
  | 'email'
  | 'offerte'
  | 'project_update'
  | 'welkomst'
  | 'notulen'
  | 'social_media'

type Tone = 'formeel' | 'informeel' | 'zakelijk' | 'vriendelijk'

const templateLabels: Record<TemplateType, string> = {
  email: 'Email bericht',
  offerte: 'Offerte introductie',
  project_update: 'Project update',
  welkomst: 'Klant welkomstbericht',
  notulen: 'Vergadernotulen',
  social_media: 'Social media post',
}

const toneLabels: Record<Tone, string> = {
  formeel: 'Formeel',
  informeel: 'Informeel',
  zakelijk: 'Zakelijk',
  vriendelijk: 'Vriendelijk',
}

const fallbackTemplates: Record<TemplateType, Record<Tone, string>> = {
  email: {
    formeel: `Beste [naam],

Hartelijk dank voor uw bericht. Naar aanleiding van ons gesprek wil ik u graag informeren over de volgende stappen.

Wij hebben uw verzoek in behandeling genomen en verwachten binnen [termijn] met een concreet voorstel te komen. Mocht u in de tussentijd vragen hebben, dan kunt u uiteraard contact met ons opnemen.

Met vriendelijke groet,
[Uw naam]
[Bedrijfsnaam]`,
    informeel: `Hoi [naam],

Bedankt voor je bericht! Leuk om van je te horen.

Ik heb even naar je vraag gekeken en ik denk dat we je goed kunnen helpen. Laat me even de details uitwerken en dan kom ik snel bij je terug.

Groetjes,
[Uw naam]`,
    zakelijk: `Geachte [naam],

Naar aanleiding van uw aanvraag d.d. [datum] bevestigen wij de ontvangst van uw verzoek.

Wij zullen dit intern bespreken en u binnen 5 werkdagen voorzien van een passend voorstel. Bij eventuele vragen kunt u contact opnemen met ondergetekende.

Hoogachtend,
[Uw naam]
[Functie]`,
    vriendelijk: `Beste [naam],

Wat fijn dat u contact met ons opneemt! We waarderen uw interesse in onze diensten.

Ik ga graag met u in gesprek om te kijken hoe we u het beste kunnen helpen. Zullen we een moment inplannen om vrijblijvend kennis te maken?

Warme groet,
[Uw naam]`,
  },
  offerte: {
    formeel: `Geachte heer/mevrouw,

Naar aanleiding van uw aanvraag sturen wij u hierbij onze offerte voor de gevraagde werkzaamheden. In deze offerte treft u een gedetailleerd overzicht aan van de voorgestelde oplossingen, inclusief specificaties en bijbehorende kosten.

Wij zijn ervan overtuigd dat wij met onze jarenlange ervaring en vakkennis een kwalitatief hoogstaand resultaat kunnen leveren dat aan al uw verwachtingen voldoet.

Deze offerte is 30 dagen geldig. Wij zien uw reactie met belangstelling tegemoet.`,
    informeel: `Hoi!

Hierbij onze offerte zoals besproken. We hebben alles zo duidelijk mogelijk uitgewerkt zodat je precies weet wat je kunt verwachten.

Neem gerust contact op als je vragen hebt of als je iets wilt aanpassen. We denken graag met je mee!`,
    zakelijk: `Geachte relatie,

Bijgaand ontvangt u onze offerte conform uw specificaties. De offerte omvat alle benodigde werkzaamheden, materialen en installatiekosten.

De genoemde prijzen zijn exclusief BTW en geldig tot 30 dagen na dagtekening. Levering geschiedt conform onze algemene voorwaarden.

Wij vertrouwen erop u hiermee een passend aanbod te hebben gedaan.`,
    vriendelijk: `Beste [naam],

Wat leuk dat u interesse heeft in onze diensten! We hebben met plezier deze offerte voor u samengesteld.

U vindt hierin een compleet overzicht van wat we voor u kunnen betekenen. We hebben ons best gedaan om een aanbod te maken dat perfect bij uw wensen past.

Heeft u vragen? Bel of mail gerust - we helpen u graag!`,
  },
  project_update: {
    formeel: `Geachte [naam],

Hierbij informeren wij u over de voortgang van project "[projectnaam]".

**Huidige status:** Op schema
**Voortgang:** [percentage]%
**Verwachte oplevering:** [datum]

Afgelopen periode is het volgende gerealiseerd:
- [Activiteit 1]
- [Activiteit 2]
- [Activiteit 3]

Komende periode staan de volgende activiteiten gepland:
- [Geplande activiteit 1]
- [Geplande activiteit 2]

Bij vragen kunt u contact opnemen met de projectleider.`,
    informeel: `Hoi [naam],

Even een update over het project! Het gaat lekker, we liggen goed op schema.

Dit hebben we gedaan:
- [Wat er is gedaan]

Dit staat er nog op de planning:
- [Wat er nog komt]

Ik houd je op de hoogte!`,
    zakelijk: `Projectupdate: [Projectnaam]
Datum: [datum]
Status: Op schema

Samenvatting voortgang:
De werkzaamheden verlopen conform planning. Het project is voor [percentage]% afgerond.

Gerealiseerd deze periode:
1. [Activiteit]
2. [Activiteit]

Planning komende periode:
1. [Activiteit]
2. [Activiteit]

Aandachtspunten:
- [Eventuele aandachtspunten]`,
    vriendelijk: `Beste [naam],

Ik wilde u even bijpraten over hoe het project vordert - en ik heb goed nieuws! Alles loopt lekker op schema.

We hebben flinke stappen gezet en het resultaat begint echt vorm te krijgen. Ik denk dat u er heel blij mee gaat zijn!

Zullen we binnenkort even bijpraten zodat ik u de tussenresultaten kan laten zien?`,
  },
  welkomst: {
    formeel: `Geachte [naam],

Welkom bij [Bedrijfsnaam]. Wij zijn verheugd u als nieuwe klant te mogen verwelkomen.

Als uw vaste contactpersoon ben ik altijd bereikbaar voor vragen of verzoeken. Wij streven naar een langdurige en succesvolle samenwerking.

In de bijlage vindt u onze algemene voorwaarden en contactgegevens. Aarzel niet om contact op te nemen wanneer u dat wenst.

Met vriendelijke groet,
[Uw naam]`,
    informeel: `Hoi [naam],

Welkom aan boord! Super leuk dat je voor ons hebt gekozen.

Ik ben [naam] en ik ben je vaste aanspreekpunt. Heb je vragen? Stuur me gerust een berichtje of bel even - ik help je graag!

Tot snel!`,
    zakelijk: `Geachte [naam],

Wij bevestigen hierbij de start van onze zakelijke relatie. Welkom bij [Bedrijfsnaam].

Uw accountmanager is [naam], bereikbaar via [contactgegevens]. Voor spoedeisende zaken kunt u ons bereiken op [telefoonnummer].

Wij kijken uit naar een productieve samenwerking.`,
    vriendelijk: `Beste [naam],

Wat fantastisch dat u voor ons heeft gekozen! Van harte welkom bij [Bedrijfsnaam].

Wij vinden het heel belangrijk dat u zich welkom voelt en dat we goed voor u kunnen zorgen. Uw tevredenheid staat bij ons altijd voorop.

Ik stel me graag persoonlijk aan u voor. Zullen we een kennismakingsgesprek inplannen?

Hartelijke groet,
[Uw naam]`,
  },
  notulen: {
    formeel: `VERGADERNOTULEN

Datum: [datum]
Tijd: [tijd]
Locatie: [locatie]
Aanwezig: [namen]
Afwezig: [namen]

1. OPENING
De voorzitter opent de vergadering om [tijd].

2. NOTULEN VORIGE VERGADERING
De notulen van de vorige vergadering worden goedgekeurd.

3. AGENDAPUNTEN
3.1 [Agendapunt 1]
Besproken: [samenvatting]
Besluit: [besluit]
Actie: [wie doet wat, voor wanneer]

3.2 [Agendapunt 2]
Besproken: [samenvatting]
Besluit: [besluit]

4. RONDVRAAG
[Eventuele vragen en antwoorden]

5. SLUITING
De vergadering wordt gesloten om [tijd].
Volgende vergadering: [datum]`,
    informeel: `Vergadernotities - [datum]

Wie er waren: [namen]

Wat we hebben besproken:
- [Onderwerp 1]: [korte samenvatting]
- [Onderwerp 2]: [korte samenvatting]

Afspraken:
- [Wie] gaat [wat] doen voor [wanneer]
- [Wie] gaat [wat] doen voor [wanneer]

Volgende keer: [datum]`,
    zakelijk: `Notulen vergadering [onderwerp]
Datum: [datum] | Tijd: [tijd] | Locatie: [locatie]

Deelnemers: [namen]

Agenda & Besluiten:

1. [Agendapunt]
   - Toelichting: [korte samenvatting]
   - Besluit: [besluit]
   - Actiehouder: [naam] | Deadline: [datum]

2. [Agendapunt]
   - Toelichting: [korte samenvatting]
   - Besluit: [besluit]
   - Actiehouder: [naam] | Deadline: [datum]

Actielijst:
| # | Actie | Verantwoordelijke | Deadline |
|---|-------|-------------------|----------|
| 1 | [actie] | [naam] | [datum] |`,
    vriendelijk: `Hi allemaal,

Hierbij de samenvatting van onze fijne vergadering van [datum]!

We hebben het gehad over:
- [Onderwerp 1] - en daar zijn we mooi uitgekomen
- [Onderwerp 2] - hier gaan we nog even mee aan de slag

Dit hebben we afgesproken:
- [Naam] pakt [taak] op
- [Naam] zorgt voor [taak]

Was weer een productief overleg! Tot de volgende keer op [datum].`,
  },
  social_media: {
    formeel: `Wij zijn trots om ons nieuwste project te presenteren: [projectnaam] voor [klantnaam].

Met [beschrijving van het project] hebben wij opnieuw laten zien wat vakmanschap en creativiteit samen kunnen bereiken.

Benieuwd naar wat wij voor uw bedrijf kunnen betekenen? Neem contact met ons op via [contactgegevens].

#SignCompany #Signing #Vakmanschap`,
    informeel: `Check ons nieuwste project! We zijn super trots op het resultaat voor [klantnaam].

Van ontwerp tot installatie - alles in eigen huis gedaan. Het resultaat mag er zijn, toch?

Wil jij ook opvallen? Stuur ons een DM!

#Signing #Reclame #TrotsOp`,
    zakelijk: `Projectoplevering: [projectnaam]

Scope: [beschrijving]
Klant: [klantnaam]
Resultaat: Een professionele signing-oplossing die perfect aansluit bij de huisstijl en zichtbaarheid van onze klant.

Meer informatie: [link]

#B2B #Signing #Bedrijfsreclame`,
    vriendelijk: `Wauw, wat zijn we blij met dit resultaat!

Voor [klantnaam] mochten we een prachtige [beschrijving] realiseren. Van het eerste idee tot de laatste schroef - met liefde gemaakt!

Complimenten aan het team voor het fantastische werk. En natuurlijk dank aan [klantnaam] voor het vertrouwen!

Ken jij iemand die ook mooiere signing kan gebruiken? Tag ze hieronder!

#Signing #MetLiefdeMaken #Resultaat`,
  },
}

export function AITextGenerator() {
  const [templateType, setTemplateType] = useState<TemplateType>('email')
  const [tone, setTone] = useState<Tone>('formeel')
  const [context, setContext] = useState('')
  const [output, setOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const aiConfigured = isAIConfigured()

  const handleGenerate = async () => {
    setIsLoading(true)
    setOutput('')
    setCopied(false)

    try {
      if (aiConfigured) {
        const typeMap: Record<TemplateType, 'email' | 'offerte' | 'rapport' | 'algemeen'> = {
          email: 'email',
          offerte: 'offerte',
          project_update: 'rapport',
          welkomst: 'algemeen',
          notulen: 'algemeen',
          social_media: 'algemeen',
        }

        const prompt = `Schrijf een ${templateLabels[templateType].toLowerCase()} in een ${toneLabels[tone].toLowerCase()} toon.${
          context ? ` Context: ${context}` : ''
        }`

        const result = await generateText(prompt, context || undefined, typeMap[templateType])
        setOutput(result)
      } else {
        // Use fallback templates
        await new Promise((resolve) => setTimeout(resolve, 1200))
        setOutput(fallbackTemplates[templateType][tone])
      }
    } catch (error) {
      toast.error('Er ging iets mis bij het genereren van de tekst')
      setOutput('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      toast.success('Tekst gekopieerd naar klembord')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kopiëren mislukt')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Tekst Configuratie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Template Type */}
          <div className="space-y-2">
            <Label htmlFor="template-type">Type tekst</Label>
            <Select
              value={templateType}
              onValueChange={(val) => setTemplateType(val as TemplateType)}
            >
              <SelectTrigger id="template-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templateLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone">Toon</Label>
            <Select value={tone} onValueChange={(val) => setTone(val as Tone)}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(toneLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context (optioneel)</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Beschrijf de context... bijv. klant heeft gevraagd om offerte voor gevelreclame"
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tekst genereren...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Genereer Tekst
              </>
            )}
          </Button>

          {!aiConfigured && (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/60 text-center">
              Demo modus - configureer ANTHROPIC_API_KEY op de server voor AI-gegenereerde teksten
            </p>
          )}
        </CardContent>
      </Card>

      {/* Output Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Gegenereerde Tekst</CardTitle>
            {output && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Gekopieerd!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Kopieer naar klembord
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 dark:text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Tekst wordt gegenereerd...</p>
            </div>
          ) : output ? (
            <div className="bg-background dark:bg-muted/50 rounded-lg p-4 min-h-[300px]">
              <pre className="whitespace-pre-wrap text-sm text-foreground/80 dark:text-muted-foreground/30 font-sans leading-relaxed">
                {output}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60 dark:text-muted-foreground">
              <Sparkles className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm text-center">
                Selecteer een type, toon en klik op "Genereer Tekst"
                <br />
                om een professionele tekst te maken
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
