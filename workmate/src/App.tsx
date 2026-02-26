import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PaletteProvider } from '@/contexts/PaletteContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layouts/AppLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { LoginPage } from '@/components/auth/LoginPage'
import { RegisterPage } from '@/components/auth/RegisterPage'
import { WorkmateDashboard } from '@/components/dashboard/WorkmateDashboard'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { ProjectCreate } from '@/components/projects/ProjectCreate'
import { ClientsLayout } from '@/components/clients/ClientsLayout'
import { ClientProfile } from '@/components/clients/ClientProfile'
import { QuotesPipeline } from '@/components/quotes/QuotesPipeline'
import { QuoteCreation } from '@/components/quotes/QuoteCreation'
import { ForgeQuotePreview } from '@/components/quotes/ForgeQuotePreview'
import { OfferteDetail } from '@/components/quotes/OfferteDetail'
import { DocumentsLayout } from '@/components/documents/DocumentsLayout'
import { EmailLayout } from '@/components/email/EmailLayout'
import { CalendarLayout } from '@/components/calendar/CalendarLayout'
import { FinancialLayout } from '@/components/financial/FinancialLayout'
import { TasksLayout } from '@/components/tasks/TasksLayout'
import { WorkmateAIChat } from '@/components/ai/WorkmateAIChat'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { DataImportLayout } from '@/components/import/DataImportLayout'
import { NewsletterBuilder } from '@/components/newsletter/NewsletterBuilder'
import { FacturenLayout } from '@/components/invoices/FacturenLayout'
import { RapportagesLayout } from '@/components/reports/RapportagesLayout'
import { TijdregistratieLayout } from '@/components/timetracking/TijdregistratieLayout'
import { NacalculatieLayout } from '@/components/nacalculatie/NacalculatieLayout'
import { MontagePlanningLayout } from '@/components/montage/MontagePlanningLayout'
import { TeamLayout } from '@/components/team/TeamLayout'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { ClientApprovalPage } from '@/components/approval/ClientApprovalPage'
import { useDataInit } from '@/hooks/useDataInit'

function AppContent() {
  const { isReady } = useDataInit()

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <>
    <CommandPalette />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* Publieke route - klant goedkeuring (geen login vereist) */}
      <Route path="/goedkeuring/:token" element={<ClientApprovalPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<WorkmateDashboard />} />
        <Route path="projecten" element={<ProjectsList />} />
        <Route path="projecten/nieuw" element={<ProjectCreate />} />
        <Route path="projecten/:id" element={<ProjectDetail />} />
        <Route path="klanten" element={<ClientsLayout />} />
        <Route path="klanten/:id" element={<ClientProfile />} />
        <Route path="offertes" element={<QuotesPipeline />} />
        <Route path="offertes/nieuw" element={<QuoteCreation />} />
        <Route path="offertes/:id" element={<ForgeQuotePreview />} />
        <Route path="offertes/:id/detail" element={<OfferteDetail />} />
        <Route path="documenten" element={<DocumentsLayout />} />
        <Route path="email" element={<EmailLayout />} />
        <Route path="kalender" element={<CalendarLayout />} />
        <Route path="financieel" element={<FinancialLayout />} />
        <Route path="taken" element={<TasksLayout />} />
        <Route path="facturen" element={<FacturenLayout />} />
        <Route path="rapportages" element={<RapportagesLayout />} />
        <Route path="tijdregistratie" element={<TijdregistratieLayout />} />
        <Route path="nacalculatie" element={<NacalculatieLayout />} />
        <Route path="montage" element={<MontagePlanningLayout />} />
        <Route path="team" element={<TeamLayout />} />
        <Route path="nieuwsbrieven" element={<NewsletterBuilder />} />
        <Route path="importeren" element={<DataImportLayout />} />
        <Route path="ai" element={<WorkmateAIChat />} />
        <Route path="instellingen" element={<SettingsLayout />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PaletteProvider>
          <LanguageProvider>
            <AuthProvider>
              <AppSettingsProvider>
                <SidebarProvider>
                  <ErrorBoundary>
                    <Toaster position="top-right" richColors />
                    <AppContent />
                  </ErrorBoundary>
                </SidebarProvider>
              </AppSettingsProvider>
            </AuthProvider>
          </LanguageProvider>
        </PaletteProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
