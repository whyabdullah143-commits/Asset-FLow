import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Briefcase,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Ticket,
  Users,
  DollarSign,
  HelpCircle,
  Bell,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  unreadCount?: number;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onCloseMobile,
  unreadCount = 0,
  unreadNotificationsCount,
}) => {
  const { logout } = useAuth();
  const effectiveUnread = unreadNotificationsCount !== undefined ? unreadNotificationsCount : unreadCount;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'plans', label: 'Investment Plans', icon: Layers },
    { id: 'my-plans', label: 'My Active Plans', icon: Briefcase },
    { id: 'deposit', label: 'Deposit Funds', icon: ArrowDownToLine },
    { id: 'withdraw', label: 'Withdrawal', icon: ArrowUpFromLine },
    { id: 'transactions', label: 'Transactions Ledger', icon: Receipt },
    { id: 'promo', label: 'Promo Codes', icon: Ticket },
    { id: 'team', label: 'Team & Ranks', icon: Users },
    { id: 'salary', label: 'Weekly Salary', icon: DollarSign },
    { id: 'support', label: 'Help Center', icon: HelpCircle },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'settings', label: 'Account Settings', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className="flex flex-col w-full select-none">
      {/* Nav List */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Logout button */}
      <div className="pt-3 mt-3 border-t border-slate-800/80">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
