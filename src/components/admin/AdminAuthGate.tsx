import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AdminAuthGateProps {
  onSuccess: () => void;
  onExit: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ onSuccess, onExit }) => {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const fillSuggestedCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    success('Admin credentials applied from suggestions!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      error('Please enter admin credentials');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      success('Administrator session authorized. Welcome to Backoffice.');
      onSuccess();
    } catch (err: any) {
      error(err.message || 'Invalid administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="rounded-3xl border border-slate-800 bg-[#0c1324]/95 backdrop-blur-2xl shadow-2xl p-7 sm:p-9 space-y-6">
          {/* Brand Logo & Backoffice Title */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center shadow-xl shadow-amber-500/20 text-slate-950 mb-3">
              <Shield className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Syne']">
              AssetFlow <span className="text-amber-400">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
              Administrative portal for system ledger, payout approvals, and configuration.
            </p>
          </div>

          {/* Quick Suggestion Box */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-amber-300">Suggestion Credentials</p>
                <p className="text-[10px] text-slate-300 font-mono">
                  User: <span className="text-white font-bold">admin</span> &bull; Pass: <span className="text-white font-bold">admin123</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fillSuggestedCredentials}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] tracking-wide transition-all shadow-sm shadow-amber-500/20 cursor-pointer shrink-0"
            >
              Auto-fill
            </button>
          </div>

          {/* Admin Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Native Browser Datalist Suggestion */}
            <datalist id="admin-user-suggestions">
              <option value="admin">Administrator account</option>
              <option value="admin@assetflow.com">Admin primary email</option>
            </datalist>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="username"
                  id="admin_username"
                  placeholder="Enter username"
                  list="admin-user-suggestions"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="admin_password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/40 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Return / Exit Link */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Investor Portal</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
