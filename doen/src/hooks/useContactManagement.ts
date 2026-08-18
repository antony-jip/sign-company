import { useState } from 'react'
import { toast } from 'sonner'
import { updateKlant } from '@/services/supabaseService'
import { logger } from '@/utils/logger'
import type { Klant, Contactpersoon } from '@/types'

interface ContactManagementDeps {
  selectedKlant: Klant | undefined
  setKlanten: React.Dispatch<React.SetStateAction<Klant[]>>
  setSelectedContactId: (id: string) => void
  setContactpersoon: (name: string) => void
}

export function useContactManagement(deps: ContactManagementDeps) {
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContactNaam, setNewContactNaam] = useState('')
  const [newContactFunctie, setNewContactFunctie] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [newContactTelefoon, setNewContactTelefoon] = useState('')

  const handleAddContact = async () => {
    if (!deps.selectedKlant || !newContactNaam.trim()) {
      toast.error('Vul minimaal een naam in')
      return
    }
    const newContact: Contactpersoon = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      naam: newContactNaam.trim(),
      functie: newContactFunctie.trim(),
      email: newContactEmail.trim(),
      telefoon: newContactTelefoon.trim(),
      is_primair: !deps.selectedKlant.contactpersonen?.length,
    }
    const updatedContactpersonen = [...(deps.selectedKlant.contactpersonen || []), newContact]
    try {
      await updateKlant(deps.selectedKlant.id, { contactpersonen: updatedContactpersonen })
      deps.setKlanten(prev => prev.map(k =>
        k.id === deps.selectedKlant!.id ? { ...k, contactpersonen: updatedContactpersonen } : k
      ))
      deps.setSelectedContactId(newContact.id)
      deps.setContactpersoon(newContact.naam)
      setShowNewContact(false)
      setNewContactNaam('')
      setNewContactFunctie('')
      setNewContactEmail('')
      setNewContactTelefoon('')
      toast.success(`${newContact.naam} toegevoegd als contactpersoon`)
    } catch (err) {
      logger.error('Kon contactpersoon niet opslaan:', err)
      toast.error('Kon contactpersoon niet opslaan')
    }
  }

  const handleSelectContact = (contactId: string) => {
    if (contactId === '__new__') {
      setShowNewContact(true)
      deps.setSelectedContactId('')
      return
    }
    if (contactId === '__manual__') {
      deps.setSelectedContactId('')
      setShowNewContact(false)
      return
    }
    const contact = deps.selectedKlant?.contactpersonen?.find(c => c.id === contactId)
    if (contact) {
      deps.setSelectedContactId(contact.id)
      deps.setContactpersoon(contact.naam)
      setShowNewContact(false)
    }
  }

  return {
    showNewContact,
    setShowNewContact,
    newContactNaam,
    setNewContactNaam,
    newContactFunctie,
    setNewContactFunctie,
    newContactEmail,
    setNewContactEmail,
    newContactTelefoon,
    setNewContactTelefoon,
    handleAddContact,
    handleSelectContact,
  }
}
