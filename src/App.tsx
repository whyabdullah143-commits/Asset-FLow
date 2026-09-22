import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LiveSettingsProvider, useLiveSettings } from './context/LiveSettingsContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AdminAuthGate } from './components/admin/AdminAuthGate';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AdminSidebar } from './components/layout/AdminSidebar';
import { apiRequest } from './lib/api';

// User Views
import { UserDashboard } from './components/dashboard/UserDashboard';
import { PlansView } from './components/plans/PlansView';
import { MyPlansView } from './components/plans/MyPlansView';
import { EarningsView } from './components/earnings/EarningsView';
import { DepositView } from './components/deposits/DepositView';
import { WithdrawalView } from './components/withdrawals/WithdrawalView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { PromoView } from './components/promo/PromoView';
import { ReferralsView } from './components/team/ReferralsView';
import { SalaryView } from './components/team/SalaryView';
import { SupportView } from './components/support/SupportView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ProfileView } from './components/profile/ProfileView';

// Admin Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminUsersView } from './components/admin/AdminUsersView';
import { AdminPlansView } from './components/admin/AdminPlansView';
import { AdminDepositsView } from './components/admin/AdminDepositsView';
import { AdminWithdrawalsView } from './components/admin/AdminWithdrawalsView';
import { AdminPaymentMethodsView } from './components/admin/AdminPaymentMethodsView';
import { AdminPromoCodesView } from './components/admin/AdminPromoCodesView';
import { AdminMilestonesView } from './components/admin/AdminMilestonesView';
import { AdminSalaryView } from './components/admin/AdminSalaryView';
import { AdminSupportView } from './components/admin/AdminSupportView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { AdminAuditLogsView } from './components/admin/AdminAuditLogsView';

import {
  LayoutDashboard,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  TrendingUp,
  Loader2,
  Shield,
  Megaphone,
} from 'lucide-react';

const isPathAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/admin' ||
    path === '/admin/' ||
    path.startsWith('/admin/') ||
    path === '/dmin' ||
    path === '/dmin/' ||
    path.startsWith('/dmin/') ||
    path === '/aadmin' ||
    path.startsWith('/aadmin/') ||
    hash === '#admin' ||
    hash === '#/admin' ||
    hash.startsWith('#/admin') ||
    hash === '#dmin' ||
    hash === '#/dmin' ||
    hash.startsWith('#/dmin') ||
    search.includes('admin') ||
    search.includes('dmin')
  );
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { settings } = useLiveSettings();
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(isPathAdmin);
  const [currentTab, setCurrentTab] = useState<string>(() => (isPathAdmin() ? 'admin-dashboard' : 'dashboard'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Counters
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pendingDepositsCount, setPendingDepositsCount] = useState<number>(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

  // Dynamic document title
  useEffect(() => {
    if (settings.siteName) {
      document.title = `${settings.siteName} - ${settings.tagline || 'Automated Yield & Staking Platform'}`;
    }
  }, [settings.siteName, settings.tagline]);

  // URL location listener for /aadmin
  useEffect(() => {
    const handleLocationChange = () => {
      const onAdmin = isPathAdmin();
      setIsAdminRoute(onAdmin);
      if (onAdmin) {
        if (!currentTab.startsWith('admin-')) {
          setCurrentTab('admin-dashboard');
        }
      } else {
        if (currentTab.startsWith('admin-')) {
          setCurrentTab('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [currentTab]);

  // Fetch counters
  const refreshCounts = async () => {
    if (!user) return;
    try {
      // User notifications
      const notifData = await apiRequest<{ unreadCount: number }>('/api/user/notifications');
      setUnreadCount(notifData.unreadCount || 0);

      // Admin pending counts
      if (user.role === 'admin') {
        const [depData, withData] = await Promise.all([
          apiRequest<{ deposits: any[] }>('/api/admin/deposits'),
          apiRequest<{ withdrawals: any[] }>('/api/admin/withdrawals'),
        ]);
        const pDep = (depData.deposits || []).filter((d) => d.status === 'pending').length;
        const pWith = (withData.withdrawals || []).filter((w) => w.status === 'pending').length;
        setPendingDepositsCount(pDep);
        setPendingWithdrawalsCount(pWith);
      }
    } catch (err) {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    if (user) {
      refreshCounts();
      const interval = setInterval(refreshCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-2xl shadow-amber-500/20 flex items-center justify-center animate-pulse mb-4">
          <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Loading AssetFlow Financial Engine...</span>
        </div>
      </div>
    );
  }

  // If visiting /aadmin:
  if (isAdminRoute) {
    // If not signed in, or signed in as a non-admin, show the dedicated Admin Authentication Gateway
    if (!user || user.role !== 'admin') {
      return (
        <AdminAuthGate
          onSuccess={() => {
            setCurrentTab('admin-dashboard');
          }}
          onExit={() => {
            window.history.pushState({}, '', '/');
            setIsAdminRoute(false);
            setCurrentTab('dashboard');
          }}
        />
      );
    }

    // Signed in as admin on /aadmin -> Render Admin Backoffice
    const renderAdminContent = () => {
      switch (currentTab) {
        case 'admin-dashboard':
          return (
            <AdminDashboard
              setCurrentTab={setCurrentTab}
              onRefreshPendingCounts={refreshCounts}
            />
          );
        case 'admin-users':
          return <AdminUsersView />;
        case 'admin-plans':
          return <AdminPlansView />;
        case 'admin-deposits':
          return <AdminDepositsView />;
        case 'admin-withdrawals':
          return <AdminWithdrawalsView />;
        case 'admin-payment-methods':
          return <AdminPaymentMethodsView />;
        case 'admin-promo':
          return <AdminPromoCodesView />;
        case 'admin-milestones':
          return <AdminMilestonesView />;
        case 'admin-salary':
          return <AdminSalaryView />;
        case 'admin-support':
          return <AdminSupportView />;
        case 'admin-settings':
          return <AdminSettingsView />;
        case 'admin-audit':
          return <AdminAuditLogsView />;
        default:
          return (
            <AdminDashboard
              setCurrentTab={setCurrentTab}
              onRefreshPendingCounts={refreshCounts}
            />
          );
      }
    };

    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          siteName={settings.siteName}
          isAdminMode={true}
          setIsAdminMode={() => {}}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          unreadNotificationsCount={unreadCount}
        />

        <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
          {/* Desktop Admin Left Sidebar */}
          <div className="hidden lg:block w-64 shrink-0 p-4">
            <div className="sticky top-20 bg-[#070c18] border border-rose-900/30 rounded-2xl p-2.5 shadow-xl">
              <AdminSidebar
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                pendingDepositsCount={pendingDepositsCount}
                pendingWithdrawalsCount={pendingWithdrawalsCount}
              />
            </div>
          </div>

          {/* Mobile Admin Slide-out Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="relative w-80 max-w-[85%] bg-[#070c18] border-r border-rose-900/40 h-full p-4 overflow-y-auto z-10 flex flex-col justify-between shadow-2xl">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 shadow-md shadow-rose-500/20">
                        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                          <Shield className="w-4 h-4 text-rose-400" />
                        </div>
                      </div>
                      <div>
                        <span className="font-extrabold text-white text-base font-['Syne']">
                          ASSET<span className="text-rose-400">ADMIN</span>
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">Backoffice Control</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <AdminSidebar
                    currentTab={currentTab}
                    setCurrentTab={(tab) => {
                      setCurrentTab(tab);
                      setMobileMenuOpen(false);
                    }}
                    onCloseMobile={() => setMobileMenuOpen(false)}
                    pendingDepositsCount={pendingDepositsCount}
                    pendingWithdrawalsCount={pendingWithdrawalsCount}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main Admin Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-20 lg:pb-8">
            {renderAdminContent()}
          </main>
        </div>
      </div>
    );
  }

  // Normal root route (Non-Admin):
  // If not signed in, show clean Sign In / Create Account Screen
  if (!user) {
    return <AuthScreen />;
  }

  // User Views
  const renderUserContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <UserDashboard setCurrentTab={setCurrentTab} />;
      case 'plans':
        return <PlansView setCurrentTab={setCurrentTab} />;
      case 'my-plans':
        return <MyPlansView setCurrentTab={setCurrentTab} />;
      case 'earnings':
        return <EarningsView setCurrentTab={setCurrentTab} />;
      case 'deposit':
        return <DepositView setCurrentTab={setCurrentTab} />;
      case 'withdraw':
        return <WithdrawalView setCurrentTab={setCurrentTab} />;
      case 'transactions':
        return <TransactionsView />;
      case 'promo':
        return <PromoView />;
      case 'team':
      case 'referrals':
        return <ReferralsView setCurrentTab={setCurrentTab} />;
      case 'salary':
        return <SalaryView />;
      case 'support':
        return <SupportView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
      case 'settings':
        return <ProfileView />;
      default:
        return <UserDashboard setCurrentTab={setCurrentTab} />;
    }
  };

  // Real-time Global Maintenance Mode screen for public users
  if (settings.maintenanceMode && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col items-center justify-center p-6 text-center selection:bg-rose-500/30 selection:text-rose-200">
        <div className="max-w-md w-full bg-[#0d1527] border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider inline-block mb-3">
            System Maintenance Underway
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-['Syne']">
            {settings.siteName || 'AssetFlow'} Upgrade in Progress
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
            Our engineering team is performing scheduled maintenance. Yield calculations and ledgers will resume automatically as soon as completed.
          </p>
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col gap-2.5 text-xs text-slate-400">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono text-[11px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>⚡ Live Global Sync (Auto-resumes instantaneously)</span>
            </div>
            {settings.supportWhatsApp && (
              <a
                href={settings.supportWhatsApp}
                target="_blank"
                rel="noreferrer"
                className="mt-2 py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Contact Official WhatsApp Support</span>
              </a>
            )}
            {settings.supportTelegram && (
              <a
                href={settings.supportTelegram}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>Join Official Telegram Channel</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        siteName={settings.siteName}
        isAdminMode={false}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        unreadNotificationsCount={unreadCount}
      />

      {/* Broadcast Announcement Bar if active */}
      {settings.showAnnouncement && settings.announcementText && !dismissAnnouncement && (
        <div className="bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-500/25 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-200 flex items-center justify-between z-20 sticky top-16 backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-[1400px] mx-auto flex-1 justify-center text-center">
            <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{settings.announcementText}</span>
          </div>
          <button
            onClick={() => setDismissAnnouncement(true)}
            className="text-amber-400/80 hover:text-white p-1 text-xs shrink-0 cursor-pointer ml-2"
            title="Dismiss announcement"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:block w-64 shrink-0 p-4">
          <div className="sticky top-20 bg-[#080d1a] border border-slate-800/80 rounded-2xl p-2.5 shadow-xl">
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              unreadNotificationsCount={unreadCount}
            />
          </div>
        </div>

        {/* Mobile slide-out drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-80 max-w-[85%] bg-[#080d1a] border-r border-slate-800/90 h-full p-4 overflow-y-auto z-10 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shadow-amber-500/20">
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                    <div>
                      <span className="font-extrabold text-white text-base tracking-tight font-['Syne']">
                        ASSET<span className="text-amber-400">FLOW</span>
                      </span>
                      <p className="text-[10px] text-slate-400 font-medium">Investor Portal</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <Sidebar
                  currentTab={currentTab}
                  setCurrentTab={(tab) => {
                    setCurrentTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  onCloseMobile={() => setMobileMenuOpen(false)}
                  unreadNotificationsCount={unreadCount}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-24 lg:pb-8">
          {renderUserContent()}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e1628]/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setCurrentTab('plans')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentTab === 'plans' || currentTab === 'my-plans' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Plans</span>
        </button>

        <button
          onClick={() => setCurrentTab('deposit')}
          className="flex flex-col items-center -mt-5 cursor-pointer"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
            <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-bold text-amber-400 mt-1">Deposit</span>
        </button>

        <button
          onClick={() => setCurrentTab('withdraw')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentTab === 'withdraw' ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          <ArrowUpFromLine className="w-4 h-4" />
          <span>Payout</span>
        </button>

        <button
          onClick={() => setCurrentTab('team')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold transition-colors ${
            currentTab === 'team' || currentTab === 'referrals' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LiveSettingsProvider>
          <MainLayout />
        </LiveSettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
