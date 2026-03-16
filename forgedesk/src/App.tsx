import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PaletteProvider } from '@/contexts/PaletteContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { TabsProvider } from '@/contexts/TabsContext'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layouts/AppLayout'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { LoginPage } from '@/components/auth/LoginPage'
import { RegisterPage } from '@/components/auth/RegisterPage'
import { CheckInboxPage } from '@/components/auth/CheckInboxPage'
import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/components/auth/ResetPasswordPage'
import { WelkomPagina } from '@/components/onboarding/WelkomPagina'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { FORGEdeskDashboard } from '@/components/dashboard/FORGEdeskDashboard'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { ProjectCreate } from '@/components/projects/ProjectCreate'
import { ClientsLayout } from '@/components/clients/ClientsLayout'
import { ClientProfile } from '@/components/clients/ClientProfile'
import { KlantenImportPage } from '@/components/clients/KlantenImportPage'
import { QuotesPipeline } from '@/components/quotes/QuotesPipeline'
import { QuoteCreation } from '@/components/quotes/QuoteCreation'
import { ForgeQuotePreview } from '@/components/quotes/ForgeQuotePreview'
import { InkoopOffertesPage } from '@/components/quotes/InkoopOffertesPage'
import { OfferteDetail } from '@/components/quotes/OfferteDetail'
import { DocumentsLayout } from '@/components/documents/DocumentsLayout'
import { EmailLayout } from '@/components/email/EmailLayout'
import { EmailComposePage } from '@/components/email/EmailComposePage'
import { PlanningLayout } from '@/components/planning/PlanningLayout'
import { FinancialLayout } from '@/components/financial/FinancialLayout'
import { TasksLayout } from '@/components/tasks/TasksLayout'
import { FORGEdeskAIChat } from '@/components/ai/FORGEdeskAIChat'
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { DataImportLayout } from '@/components/import/DataImportLayout'
import { NewsletterBuilder } from '@/components/newsletter/NewsletterBuilder'
import { FacturenLayout } from '@/components/invoices/FacturenLayout'
import { FactuurEditor } from '@/components/invoices/FactuurEditor'
import { RapportagesLayout } from '@/components/reports/RapportagesLayout'
import { TijdregistratieLayout } from '@/components/timetracking/TijdregistratieLayout'
import { NacalculatieLayout } from '@/components/nacalculatie/NacalculatieLayout'
import { TeamLayout } from '@/components/team/TeamLayout'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { ClientApprovalPage } from '@/components/approval/ClientApprovalPage'
import { BookingBeheer } from '@/components/booking/BookingBeheer'
import { PublicBookingPage } from '@/components/booking/PublicBookingPage'
import { WerkbonnenLayout } from '@/components/werkbonnen/WerkbonnenLayout'
import { WerkbonDetail } from '@/components/werkbonnen/WerkbonDetail'
import { BetaalPagina } from '@/components/betaling/BetaalPagina'
import { BetaaldPagina } from '@/components/betaling/BetaaldPagina'
import { OffertePubliekPagina } from '@/components/offerte/OffertePubliekPagina'
import { BestelbonnenLayout } from '@/components/bestelbonnen/BestelbonnenLayout'
import { BestelbonDetail } from '@/components/bestelbonnen/BestelbonDetail'
import { LeveringsbonnenLayout } from '@/components/leveringsbonnen/LeveringsbonnenLayout'
import { LeveringsbonDetail } from '@/components/leveringsbonnen/LeveringsbonDetail'
import { VoorraadLayout } from '@/components/voorraad/VoorraadLayout'
import { DealsLayout } from '@/components/deals/DealsLayout'
import { DealDetail } from '@/components/deals/DealDetail'
import { LeadCaptureLayout } from '@/components/leads/LeadCaptureLayout'
import { LeadFormulierEditor } from '@/components/leads/LeadFormulierEditor'
import { LeadFormulierPubliek } from '@/components/leads/LeadFormulierPubliek'
import { PortaalPagina } from '@/components/portaal/PortaalPagina'
import { PortalenOverzicht } from '@/components/portaal/PortalenOverzicht'
import { MeldingenPage } from '@/components/notifications/MeldingenPage'
import { LeadInzendingenLayout } from '@/components/leads/LeadInzendingenLayout'
import { ForecastLayout } from '@/components/forecast/ForecastLayout'
import { ForgieChatPage } from '@/components/forgie/ForgieChatPage'
import { VisualizerLayout } from '@/components/visualizer/VisualizerLayout'
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
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/registreren" element={<RegisterPage />} />
      <Route path="/check-inbox" element={<CheckInboxPage />} />
      <Route path="/wachtwoord-vergeten" element={<ForgotPasswordPage />} />
      <Route path="/wachtwoord-resetten" element={<ResetPasswordPage />} />
      {/* Publieke route - klant goedkeuring (geen login vereist) */}
      <Route path="/goedkeuring/:token" element={<ClientApprovalPage />} />
      {/* Publieke route - klant booking (geen login vereist) */}
      <Route path="/boeken/:userId" element={<PublicBookingPage />} />
      {/* Publieke route - online factuur betalen (geen login vereist) */}
      <Route path="/betalen/:token" element={<BetaalPagina />} />
      {/* Publieke route - bevestiging na Mollie betaling */}
      <Route path="/betaald" element={<BetaaldPagina />} />
      {/* Publieke route - offerte bekijken door klant (geen login vereist) */}
      <Route path="/offerte-bekijken/:token" element={<OffertePubliekPagina />} />
      {/* Publieke route - lead formulier invullen (geen login vereist) */}
      <Route path="/formulier/:token" element={<LeadFormulierPubliek />} />
      {/* Publieke route - klantportaal (geen login vereist) */}
      <Route path="/portaal/:token" element={<PortaalPagina />} />
      <Route path="/welkom" element={
        <ProtectedRoute>
          <WelkomPagina />
        </ProtectedRoute>
      } />
      <Route path="/onboarding" element={
        <ProtectedRoute>
          <OnboardingWizard />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<FORGEdeskDashboard />} />
        <Route path="projecten" element={<ProjectsList />} />
        <Route path="projecten/nieuw" element={<ProjectCreate />} />
        <Route path="projecten/:id" element={<ProjectDetail />} />
        <Route path="klanten" element={<ClientsLayout />} />
        <Route path="klanten/importeren" element={<KlantenImportPage />} />
        <Route path="klanten/:id" element={<ClientProfile />} />
        <Route path="deals" element={<DealsLayout />} />
        <Route path="deals/:id" element={<DealDetail />} />
        <Route path="offertes" element={<QuotesPipeline />} />
        <Route path="offertes/nieuw" element={<QuoteCreation />} />
        <Route path="offertes/:id" element={<QuoteCreation />} />
        <Route path="offertes/:id/bewerken" element={<QuoteCreation />} />
        <Route path="offertes/:id/preview" element={<ForgeQuotePreview />} />
        <Route path="offertes/:id/detail" element={<OfferteDetail />} />
        <Route path="inkoopoffertes" element={<InkoopOffertesPage />} />
        <Route path="documenten" element={<DocumentsLayout />} />
        <Route path="email" element={<EmailLayout />} />
        <Route path="email/compose" element={<EmailComposePage />} />
        <Route path="planning" element={<PlanningLayout />} />
        <Route path="kalender" element={<Navigate to="/planning" replace />} />
        <Route path="montage" element={<Navigate to="/planning?modus=montage" replace />} />
        <Route path="financieel" element={<FinancialLayout />} />
        <Route path="taken" element={<TasksLayout />} />
        <Route path="facturen" element={<FacturenLayout />} />
        <Route path="facturen/nieuw" element={<FactuurEditor />} />
        <Route path="facturen/:id" element={<FactuurEditor />} />
        <Route path="facturen/:id/bewerken" element={<FactuurEditor />} />
        <Route path="rapportages" element={<RapportagesLayout />} />
        <Route path="tijdregistratie" element={<TijdregistratieLayout />} />
        <Route path="nacalculatie" element={<NacalculatieLayout />} />
        <Route path="team" element={<TeamLayout />} />
        <Route path="nieuwsbrieven" element={<NewsletterBuilder />} />
        <Route path="importeren" element={<DataImportLayout />} />
        <Route path="ai" element={<FORGEdeskAIChat />} />
        <Route path="forgie" element={<ForgieChatPage />} />
        <Route path="werkbonnen" element={<WerkbonnenLayout />} />
        <Route path="werkbonnen/:id" element={<WerkbonDetail />} />
        <Route path="bestelbonnen" element={<BestelbonnenLayout />} />
        <Route path="bestelbonnen/:id" element={<BestelbonDetail />} />
        <Route path="leveringsbonnen" element={<LeveringsbonnenLayout />} />
        <Route path="leveringsbonnen/:id" element={<LeveringsbonDetail />} />
        <Route path="voorraad" element={<VoorraadLayout />} />
        <Route path="leads" element={<LeadCaptureLayout />} />
        <Route path="leads/formulieren/nieuw" element={<LeadFormulierEditor />} />
        <Route path="leads/formulieren/:id" element={<LeadFormulierEditor />} />
        <Route path="leads/inzendingen" element={<LeadInzendingenLayout />} />
        <Route path="forecast" element={<ForecastLayout />} />
        <Route path="booking" element={<BookingBeheer />} />
        <Route path="visualizer" element={<VisualizerLayout />} />
        <Route path="portalen" element={<PortalenOverzicht />} />
        <Route path="meldingen" element={<MeldingenPage />} />
        <Route path="instellingen" element={<SettingsLayout />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ErrorBoundary>
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
                  <TabsProvider>
                    <ErrorBoundary>
                      <Toaster position="top-right" richColors />
                      <AppContent />
                    </ErrorBoundary>
                  </TabsProvider>
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
