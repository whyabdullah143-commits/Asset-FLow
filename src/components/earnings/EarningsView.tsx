import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import {
  TrendingUp,
  Award,
  Sparkles,
  Users,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  DollarSign,
  Wallet,
  Briefcase,
} from 'lucide-react';
import { UserPlan } from '../../types';

interface EarningsViewProps {
  setCurrentTab?: (tab: string) => void;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ setCurrentTab = () => {} }) => {
  const { balance } = useAuth();

  const [activePlans, setActivePlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarningsData = async () => {
    try {
      const data = await apiRequest<{ userPlans: UserPlan[] }>('/api/user/plans');
      setActivePlans((data.userPlans || []).filter((p) => p.status === 'active'));
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const totalDailyReturn = activePlans.reduce((sum, p) => sum + p.dailyIncome, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-amber-400" />
            Yield & Earnings Breakdown
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time auditable overview of your daily yields, commissions, and team milestone rewards.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono self-start">
          <CheckCircle2 className="w-4 h-4" />
          <span>Automated Daily Settlement</span>
        </div>
      </div>

      {/* 8 Required Earnings Metric Cards (Section 8 of Master Prompt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Earnings */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Earnings</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            +${(balance?.todayEarnings || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Accrued across active contracts</p>
        </div>

        {/* 2. Total Cumulative Earnings */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Earnings</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${(balance?.totalEarnings || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">All-time net algorithmic return</p>
        </div>

        {/* 3. Available Earnings / Withdrawal */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available Withdrawal</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${(balance?.availableWithdrawal || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-semibold">Ready for instant payout</p>
        </div>

        {/* 4. Plan Contract Earnings */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Plan ROI Earnings</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            ${activePlans.reduce((s, p) => s + p.totalEarned, 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Direct from plan yield</p>
        </div>

        {/* 5. Referral Commission */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Referral Commission</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${(balance?.referralCommission || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">6% direct referral bonuses</p>
        </div>

        {/* 6. Team Milestone Rewards */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Team Milestone Rewards</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            ${(balance?.teamRewards || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Milestone tier bonuses</p>
        </div>

        {/* 7. Promo Code Rewards */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Promo Rewards</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">
            ${(balance?.promoRewards || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bonus code credits</p>
        </div>

        {/* 8. Total Claimed / Distributed */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Payouts Done</span>
            <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-300 font-mono">
            ${(balance?.totalWithdrawals || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Successfully withdrawn</p>
        </div>
      </div>

      {/* 24-Hour Cycle Interactive Panel */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Automated 24-Hour Yield Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              AssetFlow's automated engine pools returns every 24 hours. Click Claim ROI below to credit your liquid wallet balance instantly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('my-plans')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Go to Active Plans & Timers</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              System Yield Active
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Expected Next 24h Yield</span>
            <div className="text-3xl font-extrabold text-amber-400 font-mono mt-2">
              +${totalDailyReturn.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Based on {activePlans.length} active subscription contract(s)
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Weekly Projected Yield</span>
            <div className="text-3xl font-extrabold text-white font-mono mt-2">
              +${(totalDailyReturn * 7).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Compounded 7-day projected yield</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Projected Yield</span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-2">
              +${(totalDailyReturn * 30).toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Estimated 30-day algorithmic return</p>
          </div>
        </div>
      </div>
    </div>
  );
};
