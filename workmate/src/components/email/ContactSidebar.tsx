import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  UserPlus,
  Check,
  Mail,
  Phone,
  Building2,
  Tag,
  Banknote,
  MessageSquare,
  Calendar,
  Newspaper,
  AlertCircle,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { EmailContact } from '@/data/email-demo-data'

interface ContactSidebarProps {
  contact: EmailContact | null
  senderName: string
  senderEmail: string
  senderCompany?: string
  onAddCustomer: (email: string) => void
  onSubscribeNewsletter: (email: string) => void
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
  ]
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    klant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    leverancier: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    partner: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    klacht: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    overheid: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    particulier: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  }
  return colors[tag] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function getDealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    lost: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

function getDealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    won: 'Gewonnen',
    open: 'Open',
    pending: 'In afwachting',
    lost: 'Verloren',
  }
  return labels[status] || status
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'email': return <Mail className="w-3 h-3" />
    case 'call': return <Phone className="w-3 h-3" />
    case 'meeting': return <Calendar className="w-3 h-3" />
    default: return <MessageSquare className="w-3 h-3" />
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'email': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
    case 'call': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
    case 'meeting': return 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function ContactSidebar({
  contact,
  senderName,
  senderEmail,
  senderCompany,
  onAddCustomer,
  onSubscribeNewsletter,
}: ContactSidebarProps) {
  return (
    <div className="w-[280px] xl:w-[310px] border-l flex-shrink-0 flex flex-col bg-muted/30">
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Contact Header */}
          <div className="text-center mb-4">
            <div className="flex justify-center mb-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(senderName)}`}>
                {getInitials(senderName)}
              </div>
            </div>
            <h3 className="font-semibold text-foreground">{senderName}</h3>
            <p className="text-sm text-muted-foreground">{senderEmail}</p>
            {senderCompany && (
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {senderCompany}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-4">
            {(!contact || !contact.isCustomer) ? (
              <Button
                onClick={() => onAddCustomer(senderEmail)}
                className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
              >
                <UserPlus className="w-4 h-4" />
                Toevoegen aan klanten
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md px-3 py-2 text-sm font-medium">
                <Check className="w-4 h-4" />
                Klant in bestand
              </div>
            )}

            {(!contact || !contact.subscribedNewsletter) ? (
              <Button
                onClick={() => onSubscribeNewsletter(senderEmail)}
                variant="outline"
                className="w-full gap-2"
                size="sm"
              >
                <Newspaper className="w-4 h-4" />
                Abonneren nieuwsbrief
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md px-3 py-2 text-sm">
                <Check className="w-4 h-4" />
                Geabonneerd op nieuwsbrief
              </div>
            )}
          </div>

          {contact ? (
            <>
              {/* Phone */}
              {contact.phone && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-foreground hover:text-blue-600 transition-colors">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {contact.phone}
                  </a>
                </div>
              )}

              {/* Tags */}
              {contact.tags.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className={`text-[10px] font-medium ${getTagColor(tag)}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-3" />

              {/* Deals (Pipedrive-style) */}
              {contact.deals && contact.deals.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5" />
                    Deals
                  </h4>
                  <div className="space-y-2">
                    {contact.deals.map((deal, i) => (
                      <div key={i} className="bg-background rounded-lg border p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{deal.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{deal.value}</span>
                          <Badge variant="secondary" className={`text-[10px] ${getDealStatusColor(deal.status)}`}>
                            {getDealStatusLabel(deal.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity timeline */}
              {contact.activities && contact.activities.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activiteiten</h4>
                  <div className="space-y-0">
                    {contact.activities.map((activity, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="text-xs text-foreground">{activity.description}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notities</h4>
                  <p className="text-xs text-muted-foreground bg-background border rounded-lg p-2.5">{contact.notes}</p>
                </div>
              )}

              {/* Customer since */}
              {contact.addedDate && (
                <div className="text-[10px] text-muted-foreground text-center mt-4 pt-3 border-t">
                  In bestand sinds {new Date(contact.addedDate).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
                </div>
              )}
            </>
          ) : (
            /* New contact prompt */
            <div className="text-center py-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Nieuw contact</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  Dit emailadres is nog niet bekend in uw klantenbestand.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
