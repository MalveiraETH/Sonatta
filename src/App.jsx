import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TabsProvider } from '@/lib/TabsContext';
import { usePermissions, PAGE_PERMISSION_MAP } from '@/lib/usePermissions';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Ordem de preferência de página inicial por papel
const ROLE_DEFAULT_PAGE = {
  fonoaudiologo: { page: 'Clients', name: 'Clientes' },
  comercial:     { page: 'Clients', name: 'Clientes' },
  recepcao:      { page: 'Appointments', name: 'Agendamentos' },
};

function TabsProviderWithUser({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setReady(true); }).catch(() => setReady(true));
  }, []);

  // Aguarda o usuário carregar para definir a aba inicial correta
  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#6B3FA0] rounded-full animate-spin"></div>
      </div>
    );
  }

  const roleDefault = user ? ROLE_DEFAULT_PAGE[user.role] : null;
  const initialPage = roleDefault ? roleDefault.page : mainPageKey;
  const initialName = roleDefault ? roleDefault.name : mainPageKey;

  return (
    <TabsProvider initialPage={initialPage} initialName={initialName}>
      {children}
    </TabsProvider>
  );
}

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
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TabsProviderWithUser>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </TabsProviderWithUser>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App