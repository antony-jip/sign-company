export interface EmailContact {
  name: string
  email: string
  company?: string
  phone?: string
  klantId?: string
  isCustomer: boolean
  subscribedNewsletter: boolean
  tags: string[]
  deals?: { name: string; value: string; status: 'open' | 'won' | 'lost' | 'pending' }[]
  activities?: { type: 'email' | 'call' | 'meeting'; description: string; date: string }[]
  notes?: string
  addedDate?: string
}

/** Extract raw email address from "Name <email>" format */
export function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}
