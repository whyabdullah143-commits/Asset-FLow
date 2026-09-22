import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import {
  User,
  Mail,
  Shield,
  Key,
  Copy,
  CheckCircle2,
  Lock,
  Smartphone,
  Calendar,
  Wallet,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, balance, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [jazzcashNumber, setJazzcashNumber] = useState(user?.jazzcashNumber || '');
  const [easypaisaNumber, setEasypaisaNumber] = useState(user?.easypaisaNumber || '');
  const [usdtAddress, setUsdtAddress] = useState(user?.usdtAddress || '');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await apiRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          phone,
          jazzcashNumber,
          easypaisaNumber,
          usdtAddress,
        }),
      });
      success('Profile details updated successfully!');
      await refreshProfile();
    } catch (err: any) {
      error(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      error('Please fill in both current and new password');
      return;
    }

    setChangingPass(true);
    try {
      await apiRequest('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  const copyRefCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      success('Referral code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-amber-400" />
          Investor Profile & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal details, payout wallet destinations, and account security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: User overview card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 mx-auto mb-4 shadow-xl shadow-amber-500/15">
              <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-amber-400" />
                )}
              </div>
            </div>

            <h2 className="text-lg font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-slate-400 font-mono">@{user?.username}</p>

            <div className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {user?.role === 'admin' ? 'Master Administrator' : 'Verified Investor'}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between text-slate-400">
                <span>Account Email:</span>
                <span className="text-white truncate max-w-[140px]">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Total Balance:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${(balance?.totalBalance || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Joined Date:</span>
                <span className="text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Referral code chip */}
            <div className="mt-6 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Referral Code</div>
                <div className="text-sm font-bold font-mono text-amber-400">
                  {user?.referralCode}
                </div>
              </div>
              <button
                type="button"
                onClick={copyRefCode}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Update Profile & Password */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Details Form */}
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              General Information & Payout Accounts
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Default Payout Destinations (Optional for Auto-Fill)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">JazzCash Number</label>
                    <input
                      type="text"
                      placeholder="0300XXXXXXX"
                      value={jazzcashNumber}
                      onChange={(e) => setJazzcashNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Easypaisa Number</label>
                    <input
                      type="text"
                      placeholder="0345XXXXXXX"
                      value={easypaisaNumber}
                      onChange={(e) => setEasypaisaNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">USDT (TRC-20) Address</label>
                    <input
                      type="text"
                      placeholder="TR7NHcorq..."
                      value={usdtAddress}
                      onChange={(e) => setUsdtAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
                >
                  {updating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-rose-400" />
              Security & Credentials
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition-all"
              >
                {changingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
