import { useState, useRef } from 'react'

export interface EmailExtraBijlage {
  naam: string
  grootte: number
  base64: string
}

interface EmailComposeState {
  showVerstuurKeuze: boolean
  setShowVerstuurKeuze: (v: boolean) => void
  isSendingPortaal: boolean
  setIsSendingPortaal: (v: boolean) => void
  showEmailCompose: boolean
  setShowEmailCompose: (v: boolean) => void
  emailTo: string
  setEmailTo: (v: string) => void
  emailCc: string
  setEmailCc: (v: string) => void
  emailBcc: string
  setEmailBcc: (v: string) => void
  emailSubject: string
  setEmailSubject: (v: string) => void
  emailBody: string
  setEmailBody: (v: string) => void
  emailBijlagen: { naam: string; grootte: number }[]
  setEmailBijlagen: React.Dispatch<React.SetStateAction<{ naam: string; grootte: number }[]>>
  emailExtraBijlagen: EmailExtraBijlage[]
  setEmailExtraBijlagen: React.Dispatch<React.SetStateAction<EmailExtraBijlage[]>>
  emailScheduled: boolean
  setEmailScheduled: (v: boolean) => void
  emailScheduleDate: string
  setEmailScheduleDate: (v: string) => void
  emailScheduleTime: string
  setEmailScheduleTime: (v: string) => void
  isSendingEmail: boolean
  setIsSendingEmail: (v: boolean) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  emailSectionRef: React.RefObject<HTMLDivElement>
  handleAddBijlage: () => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  resetEmailCompose: () => void
}

export function useEmailCompose(): EmailComposeState {
  const [showVerstuurKeuze, setShowVerstuurKeuze] = useState(false)
  const [isSendingPortaal, setIsSendingPortaal] = useState(false)
  const [showEmailCompose, setShowEmailCompose] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailBcc, setEmailBcc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailBijlagen, setEmailBijlagen] = useState<{ naam: string; grootte: number }[]>([])
  const [emailExtraBijlagen, setEmailExtraBijlagen] = useState<EmailExtraBijlage[]>([])
  const [emailScheduled, setEmailScheduled] = useState(false)
  const [emailScheduleDate, setEmailScheduleDate] = useState('')
  const [emailScheduleTime, setEmailScheduleTime] = useState('08:00')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emailSectionRef = useRef<HTMLDivElement>(null)

  const handleAddBijlage = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        setEmailBijlagen((prev) => [...prev, { naam: file.name, grootte: file.size }])
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]
          if (base64) {
            setEmailExtraBijlagen((prev) => [...prev, { naam: file.name, grootte: file.size, base64 }])
          }
        }
        reader.readAsDataURL(file)
      })
    }
    e.target.value = ''
  }

  const resetEmailCompose = () => {
    setShowEmailCompose(false)
    setEmailTo('')
    setEmailCc('')
    setEmailBcc('')
    setEmailSubject('')
    setEmailBody('')
    setEmailBijlagen([])
    setEmailExtraBijlagen([])
    setEmailScheduled(false)
    setEmailScheduleDate('')
    setEmailScheduleTime('08:00')
  }

  return {
    showVerstuurKeuze, setShowVerstuurKeuze,
    isSendingPortaal, setIsSendingPortaal,
    showEmailCompose, setShowEmailCompose,
    emailTo, setEmailTo,
    emailCc, setEmailCc,
    emailBcc, setEmailBcc,
    emailSubject, setEmailSubject,
    emailBody, setEmailBody,
    emailBijlagen, setEmailBijlagen,
    emailExtraBijlagen, setEmailExtraBijlagen,
    emailScheduled, setEmailScheduled,
    emailScheduleDate, setEmailScheduleDate,
    emailScheduleTime, setEmailScheduleTime,
    isSendingEmail, setIsSendingEmail,
    fileInputRef, emailSectionRef,
    handleAddBijlage, handleFileSelect, resetEmailCompose,
  }
}
