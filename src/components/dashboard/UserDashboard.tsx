import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import {
  Wallet,
  TrendingUp,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Transaction, UserPlan } from '../../types';

interface UserDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ setCurrentTab }) => {
  const { user, balance, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [activeTeamCount, setActiveTeamCount] = useState(0);
  const [totalDailyIncome, setTotalDailyIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest('/api/user/dashboard');
      setActivePlans(data.activePlans || []);
      setRecentTransactions(data.recentTransactions || []);
      setTeamCount(data.teamMembersCount || 0);
      setActiveTeamCount(data.activeTeamMembers || 0);
      setTotalDailyIncome(data.totalDailyReturn || 0);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load dashboard data:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const referralUrl = `${window.location.origin}/?ref=${user?.referralCode || ''}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    success('Referral link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d162a] via-[#101b33] to-[#151f38] border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Algorithmic Yield Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome Back, <span className="text-amber-400">{user?.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Your investment capital is automatically deployed across high-frequency liquidity pools. Track live daily yield, manage withdrawals, and expand your team.
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setCurrentTab('deposit')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Deposit Funds</span>
            </button>

            <button
              onClick={() => setCurrentTab('withdraw')}
              className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpFromLine className="w-4 h-4 text-amber-400" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 Key Live Metric Cards (Matching Section 5 of Spec) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            ${(balance?.totalBalance || 0).toFixed(2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Avail. Withdrawal</span>
            <span className="font-mono font-bold text-emerald-400">
              ${(balance?.availableWithdrawal || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Active Plan */}
        <div
          onClick={() => setCurrentTab('my-plans')}
          className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-400 transition-colors">
              Active Plans
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {activePlans.length > 0 ? (
              <span>{activePlans[0].planName}</span>
            ) : (
              <span className="text-slate-500 text-xl">No Plan Active</span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Active Subscriptions</span>
            <span className="font-bold text-cyan-400">
              {activePlans.length} Tier{activePlans.length === 1 ? '' : 's'} →
            </span>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
            +${(balance?.todayEarnings || 0).toFixed(2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Daily Expected Yield</span>
            <span className="font-mono font-bold text-amber-400">+${totalDailyIncome.toFixed(2)}/day</span>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cumulative Yield</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            ${(balance?.totalEarnings || 0).toFixed(2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>All-time Net Profit</span>
            <span className="font-mono text-purple-300 font-bold">100% Audited</span>
          </div>
        </div>
      </div>

      {/* Second row of live cards: Team & Referral Commission */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Team Members */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Team Network</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {teamCount} <span className="text-xs font-normal text-slate-400">members</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Active Contributors</span>
            <span className="text-emerald-400 font-bold">{activeTeamCount} active</span>
          </div>
        </div>

        {/* Referral Commission */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Referral Commission</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            ${(balance?.referralCommission || 0).toFixed(2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Commission Rate</span>
            <span className="text-white font-bold">6.00% Instant</span>
          </div>
        </div>

        {/* Team Milestone & Promo Rewards */}
        <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Milestone & Promo Bonuses</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${((balance?.teamRewards || 0) + (balance?.promoRewards || 0)).toFixed(2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Milestones: ${(balance?.teamRewards || 0).toFixed(2)}</span>
            <span>Promos: ${(balance?.promoRewards || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Grid (Deposit, Withdraw, View Plans, Promo Code, Team, Support) */}
      <div className="bg-[#0d1527]/70 border border-slate-800/80 rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Quick Financial Operations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <button
            onClick={() => setCurrentTab('deposit')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-emerald-300">Deposit</span>
            <span className="text-[10px] text-slate-500">Fund Account</span>
          </button>

          <button
            onClick={() => setCurrentTab('withdraw')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-300">Withdraw</span>
            <span className="text-[10px] text-slate-500">Instant Payout</span>
          </button>

          <button
            onClick={() => setCurrentTab('plans')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-300">View Plans</span>
            <span className="text-[10px] text-slate-500">Up to 5.2% ROI</span>
          </button>

          <button
            onClick={() => setCurrentTab('salary')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-300">Weekly Salary</span>
            <span className="text-[10px] text-slate-500">7-Day Timer</span>
          </button>

          <button
            onClick={() => setCurrentTab('promo')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-purple-300">Promo Code</span>
            <span className="text-[10px] text-slate-500">Claim Bonus</span>
          </button>

          <button
            onClick={() => setCurrentTab('team')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-blue-300">Team / Invite</span>
            <span className="text-[10px] text-slate-500">Milestone Cash</span>
          </button>

          <button
            onClick={() => setCurrentTab('support')}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/40 transition-all text-center group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-slate-200">Help Desk</span>
            <span className="text-[10px] text-slate-500">24/7 Tickets</span>
          </button>
        </div>
      </div>

      {/* Two columns: 24-hour Earning Cycle & Referral Link */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 24-Hour Earning Cycle Widget */}
        <div className="lg:col-span-6 bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                24-Hour Automated Earning Cycle
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Algorithmic yield is computed hourly and unlocked for daily settlement.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Accrual
            </span>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Total Accrued Yield Today</div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono">
                ${(balance?.todayEarnings || 0).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Auto-Credited Daily</span>
            </div>
          </div>

          {/* Timeline distribution */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Yield Breakdown by Shift
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70">
                <div className="text-[10px] text-slate-400">00:00 - 06:00</div>
                <div className="font-mono font-bold text-white mt-1">
                  ${(totalDailyIncome * 0.25).toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70">
                <div className="text-[10px] text-slate-400">06:00 - 12:00</div>
                <div className="font-mono font-bold text-white mt-1">
                  ${(totalDailyIncome * 0.25).toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70">
                <div className="text-[10px] text-slate-400">12:00 - 18:00</div>
                <div className="font-mono font-bold text-white mt-1">
                  ${(totalDailyIncome * 0.25).toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70">
                <div className="text-[10px] text-slate-400">18:00 - 24:00</div>
                <div className="font-mono font-bold text-white mt-1">
                  ${(totalDailyIncome * 0.25).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invite & Referral Commission Card */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#0f172a] to-[#0c1322] border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Team Growth Program
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                6% Direct Commission
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Share your link, earn lifetime team bonuses
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Earn 6.00% instant cash directly credited to your balance when referred investors activate any plan, plus unlock up to $600.00 in cumulative milestone rewards!
            </p>

            {/* Link box */}
            <div className="p-2 pl-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
              <div className="font-mono text-xs text-slate-300 truncate">
                {referralUrl}
              </div>
              <button
                onClick={copyReferralLink}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Your Code: <strong className="text-white font-mono">{user?.referralCode}</strong>
            </span>
            <button
              onClick={() => setCurrentTab('team')}
              className="text-amber-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View Milestone Progress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Ledger Activity Table */}
      <div className="bg-[#0e1628]/90 border border-slate-800/90 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">Recent Ledger Transactions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live auditable transactions recorded in the global cloud ledger.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 px-4">Description</th>
                <th className="pb-3 px-4">Amount</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 pl-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No transactions recorded yet. Fund your account or activate a plan to get started.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="font-semibold text-white capitalize">
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={tx.isCredit ? 'text-emerald-400' : 'text-rose-400'}>
                        {tx.isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Badge status={tx.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
