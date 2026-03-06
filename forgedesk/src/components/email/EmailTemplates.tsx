import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Eye, Copy, Check } from 'lucide-react'

interface EmailTemplate {
  id: string
  naam: string
  categorie: string
  onderwerp: string
  body: string
}

const templates: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    naam: 'Offerte follow-up',
    categorie: 'Verkoop',
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],

Graag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.

Heeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.

Mocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'tmpl-2',
    naam: 'Project update',
    categorie: 'Project',
    onderwerp: 'Project update',
    body: `Beste [naam],

Hierbij een update over de voortgang van uw project [projectnaam].

Wat is er bereikt:
- [punt 1]
- [punt 2]
- [punt 3]

Volgende stappen:
- [stap 1]
- [stap 2]

Verwachte opleverdatum: [datum]

Heeft u vragen? Neem gerust contact op.

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'tmpl-3',
    naam: 'Welkomstbericht',
    categorie: 'Klantrelatie',
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],

Welkom bij Sign Company! Wij zijn verheugd om met u samen te werken.

Uw contactpersoon is [naam contactpersoon], bereikbaar via [telefoonnummer] en [emailadres].

De volgende stappen zijn:
1. Kennismakingsgesprek inplannen
2. Wensen en eisen inventariseren
3. Ontwerp voorstel opstellen

Wij kijken uit naar een prettige samenwerking!

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'tmpl-4',
    naam: 'Betaalherinnering',
    categorie: 'Financieel',
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],

Uit onze administratie blijkt dat de volgende factuur nog niet is voldaan:

Factuurnummer: [nummer]
Factuurdatum: [datum]
Bedrag: [bedrag]
Vervaldatum: [vervaldatum]

Wij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen op rekeningnummer [IBAN] o.v.v. het factuurnummer.

Mocht de betaling reeds zijn verricht, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,
[uw naam]`,
  },
]

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Verkoop: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    Project: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    Klantrelatie: 'bg-wm-pale/30 text-[#3D3522] dark:bg-accent/30 dark:text-wm-pale',
    Financieel: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  }
  return colors[category] || 'bg-muted text-foreground/80'
}

export function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (template: EmailTemplate) => {
    navigator.clipboard.writeText(template.body)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Template list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Beschikbare templates
        </h3>
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="space-y-2 pr-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-blue-500 shadow-md'
                    : ''
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{template.naam}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {template.onderwerp}
                        </p>
                      </div>
                    </div>
                    <Badge className={getCategoryColor(template.categorie)}>
                      {template.categorie}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Preview */}
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Voorbeeld
        </h3>
        {selectedTemplate ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedTemplate.naam}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Onderwerp: {selectedTemplate.onderwerp}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleCopy(selectedTemplate)}
                >
                  {copiedId === selectedTemplate.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      Gekopieerd
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Kopieer
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ScrollArea className="h-full">
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedTemplate.body}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Selecteer een template</p>
              <p className="text-xs mt-1">Klik op een template om het voorbeeld te bekijken.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
