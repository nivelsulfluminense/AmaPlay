import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import RegisterAccountScreen from './screens/RegisterAccountScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import RegisterRoleScreen from './screens/RegisterRoleScreen';
import RegisterTeamScreen from './screens/RegisterTeamScreen';
import RegisterPrivacyScreen from './screens/RegisterPrivacyScreen';
import RegisterProfileScreen from './screens/RegisterProfileScreen';
import ScoutsScreen from './screens/ScoutsScreen';
import ProSelectionScreen from './screens/ProSelectionScreen';
import ScoutsPerformanceScreen from './screens/ScoutsPerformanceScreen';
import DashboardScreen from './screens/DashboardScreen';
import AgendaScreen from './screens/AgendaScreen';
import FinanceScreen from './screens/FinanceScreen';
import InventoryScreen from './screens/InventoryScreen';
import PlayerStatsScreen from './screens/PlayerStatsScreen';
import TeamStatsScreen from './screens/TeamStatsScreen';
import PlayerPaymentsScreen from './screens/PlayerPaymentsScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SettingsScreen from './screens/SettingsScreen';
import PendingApprovalScreen from './screens/PendingApprovalScreen';
import { UserProvider, useUser } from './contexts/UserContext';
import { useAuthRedirect } from './hooks/useAuthRedirect';

// --- Helper Components & Guards ---

const PrivateRoute = ({ children }: { children: React.ReactElement }) => {
  const { userId, isInitialized } = useUser();
  if (!isInitialized) return null;
  if (!userId) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ProtectedRoute = ({ children, restrictedTo }: { children: React.ReactElement, restrictedTo?: string[] }) => {
  const { role, isInitialized, userId } = useUser();

  if (!isInitialized) return null;
  if (!userId) return <Navigate to="/" replace />;

  if (restrictedTo && !restrictedTo.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AuthGuard = ({ children }: { children: React.ReactElement }) => {
  const { isInitialized } = useUser();

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm shadow-[0_0_30px_rgba(19,236,91,0.2)]">
            <span className="material-symbols-outlined text-primary text-5xl animate-pulse">sports_soccer</span>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
        </div>
      </div>
    );
  }

  return children;
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, teamId } = useUser();

  // Don't show on auth or onboarding screens
  const hiddenRoutes = [
    '/',
    '/register-account',
    '/forgot-password',
    '/reset-password',
    '/register-role',
    '/register-team',
    '/register-privacy',
    '/register-profile'
  ];

  if (hiddenRoutes.includes(location.pathname)) return null;
  if (!teamId) return null; // Don't show if not in a team yet

  const isAdmin = role === 'presidente' || role === 'vice-presidente' || role === 'admin';

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background-dark/80 backdrop-blur-xl border-t border-white/5 px-6 flex items-center justify-around z-50">
      <button
        onClick={() => navigate('/dashboard')}
        className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/dashboard' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-outlined text-[28px] leading-none">dashboard</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
      </button>

      <button
        onClick={() => navigate('/agenda')}
        className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/agenda' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-outlined text-[28px] leading-none">calendar_month</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">Agenda</span>
      </button>

      {isAdmin && (
        <>
          <button
            onClick={() => navigate('/finance')}
            className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/finance' ? 'text-primary' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-[28px] leading-none">payments</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Finanças</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/inventory' ? 'text-primary' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-[28px] leading-none">inventory_2</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Estoque</span>
          </button>
        </>
      )}

      <button
        onClick={() => navigate('/settings')}
        className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/settings' ? 'text-primary' : 'text-slate-500'}`}
      >
        <span className="material-symbols-outlined text-[28px] leading-none">settings</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes</span>
      </button>
    </nav>
  );
};

const Layout = ({ children }: { children?: React.ReactNode }) => {
  useAuthRedirect();
  return (
    <div className="min-h-screen w-full bg-background-dark flex justify-center">
      <div className="w-full max-w-md relative bg-background-dark min-h-screen shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          <AuthGuard>
            <>{children}</>
          </AuthGuard>
        </div>
        <BottomNav />
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  return (
    <UserProvider>
      <HashRouter>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LoginScreen />} />
            <Route path="/register-account" element={<RegisterAccountScreen />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />

            {/* Onboarding Flow */}
            <Route path="/register-role" element={<RegisterRoleScreen />} />
            <Route path="/register-team" element={<RegisterTeamScreen />} />
            <Route path="/register-privacy" element={<RegisterPrivacyScreen />} />
            <Route path="/register-profile" element={<RegisterProfileScreen />} />

            {/* Application Routes */}
            <Route path="/scouts" element={<ScoutsScreen />} />

            <Route path="/pro-selection" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin', 'player']}>
                <ProSelectionScreen />
              </ProtectedRoute>
            } />

            <Route path="/scouts-performance" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin', 'player']}>
                <ScoutsPerformanceScreen />
              </ProtectedRoute>
            } />

            <Route path="/pre-dash" element={
              <ProtectedRoute>
                <PendingApprovalScreen />
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin', 'player']}>
                <DashboardScreen />
              </ProtectedRoute>
            } />

            <Route path="/agenda" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin', 'player']}>
                <AgendaScreen />
              </ProtectedRoute>
            } />

            <Route path="/finance" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin']}>
                <FinanceScreen />
              </ProtectedRoute>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin']}>
                <InventoryScreen />
              </ProtectedRoute>
            } />

            <Route path="/player-stats" element={<PlayerStatsScreen />} />

            <Route path="/team-stats" element={
              <ProtectedRoute restrictedTo={['presidente', 'vice-presidente', 'admin', 'player']}>
                <TeamStatsScreen />
              </ProtectedRoute>
            } />

            <Route path="/player-payments" element={<PlayerPaymentsScreen />} />

            <Route path="/settings" element={<SettingsScreen />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </UserProvider>
  );
};

export default App;