import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Wallet,
  Shield,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  siteName?: string;
  isAdminView?: boolean;
  setIsAdminView?: (val: boolean) => void;
  isAdminMode?: boolean;
  setIsAdminMode?: (val: boolean) => void;
  onOpenMobileMenu?: () => void;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (val: boolean) => void;
  unreadCount?: number;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  siteName,
  isAdminView: rawIsAdminView,
  setIsAdminView: rawSetIsAdminView,
  isAdminMode,
  setIsAdminMode,
  onOpenMobileMenu,
  mobileMenuOpen,
  setMobileMenuOpen,
  unreadCount = 0,
  unreadNotificationsCount,
}) => {
  const isAdminView = isAdminMode !== undefined ? isAdminMode : (rawIsAdminView || false);
  const setIsAdminView = setIsAdminMode || rawSetIsAdminView || (() => {});
  const handleOpenMobile = onOpenMobileMenu || (() => setMobileMenuOpen && setMobileMenuOpen(true));
  const effectiveUnread = unreadNotificationsCount !== undefined ? unreadNotificationsCount : unreadCount;
  const { user, balance, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const displayBrand = siteName || 'AssetFlow';
  const brandInitials = displayBrand.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0a101d]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & current section title */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-['Syne'] text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
            {brandInitials}
          </div>
          <span className="font-extrabold tracking-tight text-white font-['Syne'] text-lg hidden sm:inline">
            {displayBrand}
          </span>
          {isAdminView && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 ml-1">
              Admin Portal
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick actions, Balance chip, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Live Balance Chip (For User View) */}
        {!isAdminView && balance && (
          <button
            onClick={() => setCurrentTab('deposit')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-colors group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Balance</div>
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 font-mono">
                ${balance.totalBalance.toFixed(2)}
              </div>
            </div>
          </button>
        )}

        {/* Notifications Icon */}
        <button
          onClick={() => {
            if (isAdminView) {
              setIsAdminView(false);
            }
            setCurrentTab('notifications');
          }}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {effectiveUnread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[#0a101d] animate-pulse" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-white truncate max-w-[100px] leading-tight">
                {user?.name}
              </div>
              <div className="text-[10px] text-amber-400 font-medium capitalize leading-tight">
                {user?.role === 'admin' ? 'Administrator' : 'VIP Investor'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0e1627] border border-slate-800 shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Ref Code:</span>
                    <span className="font-mono font-bold text-amber-400">{user?.referralCode}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCurrentTab('profile');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('settings');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Security & Settings</span>
                </button>

                <div className="border-t border-slate-800/80 my-1" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
