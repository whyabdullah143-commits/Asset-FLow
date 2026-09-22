import React from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ticket,
  DollarSign,
  Award,
  CreditCard,
  MessageSquare,
  Sliders,
  FileText,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  setIsAdminView?: (value: boolean) => void;
  pendingDepositsCount?: number;
  pendingWithdrawalsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  setCurrentTab,
  onCloseMobile,
  pendingDepositsCount = 0,
  pendingWithdrawalsCount = 0,
}) => {
  const { logout } = useAuth();

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'admin-users', label: 'User Directory', icon: Users },
    { id: 'admin-plans', label: 'Investment Plans', icon: Layers },
    {
      id: 'admin-deposits',
      label: 'Deposit Requests',
      icon: ArrowDownToLine,
      badge: pendingDepositsCount,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    {
      id: 'admin-withdrawals',
      label: 'Withdrawal Payouts',
      icon: ArrowUpFromLine,
      badge: pendingWithdrawalsCount,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'admin-promo', label: 'Promo Codes', icon: Ticket },
    { id: 'admin-salary', label: 'Salary System', icon: DollarSign },
    { id: 'admin-milestones', label: 'Ranks & Milestones', icon: Award },
    { id: 'admin-payment-methods', label: 'Payment Gateways', icon: CreditCard },
    { id: 'admin-support', label: 'Support Desk', icon: MessageSquare },
    { id: 'admin-settings', label: 'System Settings', icon: Sliders },
    { id: 'admin-audit', label: 'Security Audit Logs', icon: FileText },
  ];

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className="flex flex-col w-full select-none">
      {/* Admin Nav List */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400/80">
          Admin Backoffice Controls
        </div>

        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-rose-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.badgeColor || 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Exit to Main Site and Sign Out */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-1">
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Exit to Main Site</span>
        </button>
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            logout();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Admin</span>
        </button>
      </div>
    </div>
  );
};
