import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layouts/AppLayout'
import { LoginPage } from '@/components/auth/LoginPage'
import { RegisterPage } from '@/components/auth/RegisterPage'
import { WorkmateDashboard } from '@/components/dashboard/WorkmateDashboard'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { ClientsLayout } from '@/components/clients/ClientsLayout'
import { ClientProfile } from '@/components/clients/ClientProfile'
import { QuotesPipeline } from '@/components/quotes/QuotesPipeline'
import { QuoteCreation } from '@/components/quotes/QuoteCreation'
import { ForgeQuotePreview } from '@/components/quotes/ForgeQuotePreview'
import { DocumentsLayout } from '@/components/documents/DocumentsLayout'
import { EmailLayout } from '@/components/email/EmailLayout'
import { CalendarLayout } from '@/components/calendar/CalendarLayout'
import { FinancialLayout } from '@/components/financial/FinancialLayout'
import { WorkmateAIChat } from '@/components/ai/WorkmateAIChat'
import { SettingsLayout } from '@/components/settings/SettingsLayout'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <Toaster position="top-right" richColors />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<WorkmateDashboard />} />
                  <Route path="projecten" element={<ProjectsList />} />
                  <Route path="projecten/:id" element={<ProjectDetail />} />
                  <Route path="klanten" element={<ClientsLayout />} />
                  <Route path="klanten/:id" element={<ClientProfile />} />
                  <Route path="offertes" element={<QuotesPipeline />} />
                  <Route path="offertes/nieuw" element={<QuoteCreation />} />
                  <Route path="offertes/:id" element={<ForgeQuotePreview />} />
                  <Route path="documenten" element={<DocumentsLayout />} />
                  <Route path="email" element={<EmailLayout />} />
                  <Route path="kalender" element={<CalendarLayout />} />
                  <Route path="financieel" element={<FinancialLayout />} />
                  <Route path="ai" element={<WorkmateAIChat />} />
                  <Route path="instellingen" element={<SettingsLayout />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
