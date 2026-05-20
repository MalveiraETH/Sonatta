import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import TenantsAdmin from './pages/TenantsAdmin';
import OnboardingTenant from './pages/OnboardingTenant';
import Billing from './pages/Billing';
import UsageDashboard from './pages/UsageDashboard';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';
import BackupRestore from './pages/BackupRestore';
import ApiDocs from './pages/ApiDocs';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import * as Sentry from '@sentry/react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/TenantsAdmin" element={
        <LayoutWrapper currentPageName="TenantsAdmin">
          <TenantsAdmin />
        </LayoutWrapper>
      } />
      <Route path="/OnboardingTenant" element={
        <LayoutWrapper currentPageName="OnboardingTenant">
          <OnboardingTenant />
        </LayoutWrapper>
      } />
      <Route path="/Billing" element={
        <LayoutWrapper currentPageName="Billing">
          <Billing />
        </LayoutWrapper>
      } />
      <Route path="/UsageDashboard" element={
        <LayoutWrapper currentPageName="UsageDashboard">
          <UsageDashboard />
        </LayoutWrapper>
      } />
      <Route path="/TermsOfService" element={<TermsOfService />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/Support" element={
        <LayoutWrapper currentPageName="Support">
          <Support />
        </LayoutWrapper>
      } />
      <Route path="/BackupRestore" element={
        <LayoutWrapper currentPageName="BackupRestore">
          <BackupRestore />
        </LayoutWrapper>
      } />
      <Route path="/ApiDocs" element={
        <LayoutWrapper currentPageName="ApiDocs">
          <ApiDocs />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
        <Router>
          <NavigationTracker />
          <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
            <AuthenticatedApp />
          </Sentry.ErrorBoundary>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

const ErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-red-50">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Erro Inesperado</h1>
      <p className="text-gray-600 mb-8">Desculpe, algo deu errado. Estamos investigando.</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Recarregar Página
      </button>
    </div>
  </div>
)

export default Sentry.withProfiler(App)