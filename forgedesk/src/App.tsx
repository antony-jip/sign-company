import React, { Suspense } from 'react'
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
import { CommandPalette } from '@/components/shared/CommandPalette'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDataInit } from '@/hooks/useDataInit'
import { useParams } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Lazy-loaded page components – prevents TDZ errors in production Rollup
// bundles caused by 70+ eager imports with complex initialisation order.
// ---------------------------------------------------------------------------
const lazy = (importFn: () => Promise<Record<string, unknown>>, name: string) =>
  React.lazy(() => importFn().then(m => ({ default: (m as Record<string, unknown>)[name] as React.ComponentType<any> })))

// Auth pages
const LoginPage = lazy(() => import('@/components/auth/LoginPage'), 'LoginPage')
const RegisterPage = lazy(() => import('@/components/auth/RegisterPage'), 'RegisterPage')
const CheckInboxPage = lazy(() => import('@/components/auth/CheckInboxPage'), 'CheckInboxPage')
const ForgotPasswordPage = lazy(() => import('@/components/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const ResetPasswordPage = lazy(() => import('@/components/auth/ResetPasswordPage'), 'ResetPasswordPage')

// Onboarding
const WelkomPagina = lazy(() => import('@/components/onboarding/WelkomPagina'), 'WelkomPagina')
const TeamWelkomPagina = lazy(() => import('@/components/onboarding/TeamWelkomPagina'), 'TeamWelkomPagina')
const OnboardingWizard = lazy(() => import('@/components/onboarding/OnboardingWizard'), 'OnboardingWizard')

// Dashboard
const FORGEdeskDashboard = lazy(() => import('@/components/dashboard/FORGEdeskDashboard'), 'FORGEdeskDashboard')

// Projects
const ProjectsList = lazy(() => import('@/components/projects/ProjectsList'), 'ProjectsList')
const ProjectDetail = lazy(() => import('@/components/projects/ProjectDetail'), 'ProjectDetail')
const ProjectCreate = lazy(() => import('@/components/projects/ProjectCreate'), 'ProjectCreate')
const TijdregistratieLayout = lazy(() => import('@/components/projects/TijdregistratieLayout'), 'TijdregistratieLayout')
const NacalculatieLayout = lazy(() => import('@/components/projects/NacalculatieLayout'), 'NacalculatieLayout')

// Clients
const ClientsLayout = lazy(() => import('@/components/clients/ClientsLayout'), 'ClientsLayout')
const ClientProfile = lazy(() => import('@/components/clients/ClientProfile'), 'ClientProfile')

const DealsLayout = lazy(() => import('@/components/clients/DealsLayout'), 'DealsLayout')
const DealDetail = lazy(() => import('@/components/clients/DealDetail'), 'DealDetail')

// Quotes
const QuotesPipeline = lazy(() => import('@/components/quotes/QuotesPipeline'), 'QuotesPipeline')
const QuoteCreation = lazy(() => import('@/components/quotes/QuoteCreation'), 'QuoteCreation')
const ForgeQuotePreview = lazy(() => import('@/components/quotes/ForgeQuotePreview'), 'ForgeQuotePreview')
const InkoopOffertesPage = lazy(() => import('@/components/quotes/InkoopOffertesPage'), 'InkoopOffertesPage')
const OffertePubliekPagina = lazy(() => import('@/components/quotes/OffertePubliekPagina'), 'OffertePubliekPagina')

// Documents
const DocumentsLayout = lazy(() => import('@/components/documents/DocumentsLayout'), 'DocumentsLayout')

// Email
const EmailLayout = lazy(() => import('@/components/email/EmailLayout'), 'EmailLayout')
const EmailComposePage = lazy(() => import('@/components/email/EmailComposePage'), 'EmailComposePage')
// Planning
const PlanningLayout = lazy(() => import('@/components/planning/PlanningLayout'), 'PlanningLayout')
const TasksLayout = lazy(() => import('@/components/planning/TasksLayout'), 'TasksLayout')
const BookingBeheer = lazy(() => import('@/components/planning/BookingBeheer'), 'BookingBeheer')
const PublicBookingPage = lazy(() => import('@/components/planning/PublicBookingPage'), 'PublicBookingPage')

// Financial
const FinancialLayout = lazy(() => import('@/components/financial/FinancialLayout'), 'FinancialLayout')
const VoorraadLayout = lazy(() => import('@/components/financial/VoorraadLayout'), 'VoorraadLayout')

// Inkoopfacturen (rendered as tab in FacturenLayout, not standalone)

// Invoices
const FacturenLayout = lazy(() => import('@/components/invoices/FacturenLayout'), 'FacturenLayout')
const FactuurEditor = lazy(() => import('@/components/invoices/FactuurEditor'), 'FactuurEditor')
const BetaalPagina = lazy(() => import('@/components/invoices/BetaalPagina'), 'BetaalPagina')
const BetaaldPagina = lazy(() => import('@/components/invoices/BetaaldPagina'), 'BetaaldPagina')

// Reports
const RapportagesLayout = lazy(() => import('@/components/reports/RapportagesLayout'), 'RapportagesLayout')
const ForecastLayout = lazy(() => import('@/components/reports/ForecastLayout'), 'ForecastLayout')

// Settings
const SettingsLayout = lazy(() => import('@/components/settings/SettingsLayout'), 'SettingsLayout')
const DataImportPage = lazy(() => import('@/components/import/DataImportPage'), 'DataImportPage')
const TeamLayout = lazy(() => import('@/components/settings/TeamLayout'), 'TeamLayout')

// Werkbonnen
const WerkbonnenLayout = lazy(() => import('@/components/werkbonnen/WerkbonnenLayout'), 'WerkbonnenLayout')
const WerkbonDetail = lazy(() => import('@/components/werkbonnen/WerkbonDetail'), 'WerkbonDetail')

// Kennisbank + Changelog
const KennisbankPage = lazy(() => import('@/components/kennisbank/KennisbankPage'), 'KennisbankPage')
const ChangelogPage = lazy(() => import('@/components/changelog/ChangelogPage'), 'ChangelogPage')

// Bestelbonnen
const BestelbonnenLayout = lazy(() => import('@/components/bestelbonnen/BestelbonnenLayout'), 'BestelbonnenLayout')
const BestelbonDetail = lazy(() => import('@/components/bestelbonnen/BestelbonDetail'), 'BestelbonDetail')

// Leveringsbonnen
const LeveringsbonnenLayout = lazy(() => import('@/components/leveringsbonnen/LeveringsbonnenLayout'), 'LeveringsbonnenLayout')
const LeveringsbonDetail = lazy(() => import('@/components/leveringsbonnen/LeveringsbonDetail'), 'LeveringsbonDetail')

// Leads
const LeadCaptureLayout = lazy(() => import('@/components/leads/LeadCaptureLayout'), 'LeadCaptureLayout')
const LeadFormulierEditor = lazy(() => import('@/components/leads/LeadFormulierEditor'), 'LeadFormulierEditor')
const LeadFormulierPubliek = lazy(() => import('@/components/leads/LeadFormulierPubliek'), 'LeadFormulierPubliek')
const LeadInzendingenLayout = lazy(() => import('@/components/leads/LeadInzendingenLayout'), 'LeadInzendingenLayout')

// Portaal
const PortaalPagina = lazy(() => import('@/components/portaal/PortaalPagina'), 'PortaalPagina')
const PortalenOverzicht = lazy(() => import('@/components/portaal/PortalenOverzicht'), 'PortalenOverzicht')

// Notifications
const MeldingenPage = lazy(() => import('@/components/notifications/MeldingenPage'), 'MeldingenPage')

// AI / Daan
const FORGEdeskAIChat = lazy(() => import('@/components/forgie/FORGEdeskAIChat'), 'FORGEdeskAIChat')
const ForgieChatPage = lazy(() => import('@/components/forgie/ForgieChatPage'), 'ForgieChatPage')

// Visualizer
const VisualizerLayout = lazy(() => import('@/components/visualizer/VisualizerLayout'), 'VisualizerLayout')

// Shared (lazy)
const NotFoundPage = lazy(() => import('@/components/shared/NotFoundPage'), 'NotFoundPage')

// ---------------------------------------------------------------------------
// Loading spinner used as Suspense fallback
// ---------------------------------------------------------------------------
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

/** Redirect /goedkeuring/:token → /portaal/:token (backward-compatibiliteit) */
function GoedkeuringRedirect() {
  const { token } = useParams()
  return <Navigate to={`/portaal/${token}`} replace />
}

/** Redirect /offertes/:id/detail → /offertes/:id/bewerken */
function OfferteDetailRedirect() {
  const { id } = useParams()
  return <Navigate to={`/offertes/${id}/bewerken`} replace />
}

function AppContent() {
  const { isReady } = useDataInit()

  if (!isReady) {
    return <LoadingSpinner />
  }

  return (
    <>
    <CommandPalette />
    <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/registreren" element={<RegisterPage />} />
      <Route path="/check-inbox" element={<CheckInboxPage />} />
      <Route path="/wachtwoord-vergeten" element={<ForgotPasswordPage />} />
      <Route path="/wachtwoord-resetten" element={<ResetPasswordPage />} />
      {/* Publieke route - klant goedkeuring → redirect naar portaal */}
      <Route path="/goedkeuring/:token" element={<GoedkeuringRedirect />} />
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
      <Route path="/team-welkom" element={
        <ProtectedRoute>
          <TeamWelkomPagina />
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
        <Route path="klanten/importeren" element={<Navigate to="/importeren" replace />} />
        <Route path="klanten/:id" element={<ClientProfile />} />
        <Route path="deals" element={<DealsLayout />} />
        <Route path="deals/:id" element={<DealDetail />} />
        <Route path="offertes" element={<QuotesPipeline />} />
        <Route path="offertes/nieuw" element={<QuoteCreation />} />
        <Route path="offertes/:id" element={<QuoteCreation />} />
        <Route path="offertes/:id/bewerken" element={<QuoteCreation />} />
        <Route path="offertes/:id/preview" element={<ForgeQuotePreview />} />
        <Route path="offertes/:id/detail" element={<OfferteDetailRedirect />} />
        <Route path="inkoopoffertes" element={<InkoopOffertesPage />} />
        <Route path="documenten" element={<DocumentsLayout />} />
        <Route path="email" element={<EmailLayout />} />
        <Route path="email/compose" element={<EmailLayout />} />
        <Route path="planning" element={<PlanningLayout />} />
        <Route path="kalender" element={<Navigate to="/planning" replace />} />
        <Route path="montage" element={<Navigate to="/planning?modus=montage" replace />} />
        <Route path="inkoopfacturen" element={<Navigate to="/facturen?tab=inkoop" replace />} />
        <Route path="inkoopfacturen/:id" element={<Navigate to="/facturen?tab=inkoop" replace />} />
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

        <Route path="importeren" element={<DataImportPage />} />
        <Route path="ai" element={<FORGEdeskAIChat />} />
        <Route path="forgie" element={<ForgieChatPage />} />
        <Route path="kennisbank" element={<KennisbankPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
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
    </Suspense>
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
                      <Toaster
                        position="top-right"
                        visibleToasts={2}
                        duration={4000}
                        toastOptions={{
                          style: {
                            background: '#FFFFFF',
                            border: '0.5px solid #E6E4E0',
                            borderRadius: '10px',
                            boxShadow: '0 8px 32px rgba(100, 80, 40, 0.1)',
                            color: '#191919',
                            fontSize: '12px',
                            animation: 'toast-in 300ms ease-out',
                          },
                          classNames: {
                            success: 'toast-success',
                            error: 'toast-error',
                          },
                        }}
                      />
                      <ConfirmDialog />
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
