import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { UserPlan } from '../../types';
import {
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  Lock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface MyPlansViewProps {
  setCurrentTab: (tab: string) => void;
}

interface PlanCardProps {
  plan: UserPlan;
  currentTime: number;
  onClaim: (planId: string) => Promise<void>;
  isClaiming: boolean;
}

const PlanCardWithTimer: React.FC<PlanCardProps> = ({
  plan,
  currentTime,
  onClaim,
  isClaiming,
}) => {
  const start = new Date(plan.startDate);
  const expiry = new Date(plan.expiryDate);
  const totalDurationMs = Math.max(1, expiry.getTime() - start.getTime());
  const elapsedTotalMs = Math.max(0, currentTime - start.getTime());
  const contractPercent = Math.min(100, Math.round((elapsedTotalMs / totalDurationMs) * 100));

  const isContractExpired = plan.status === 'completed' || currentTime >= expiry.getTime();

  // 24-Hour Cycle calculation (86,400,000 ms)
  const CYCLE_MS = 24 * 60 * 60 * 1000;
  const lastRefTime = new Date(plan.lastClaimDate || plan.startDate).getTime();
  const nextClaimTimestamp = plan.nextClaimTime
    ? new Date(plan.nextClaimTime).getTime()
    : lastRefTime + CYCLE_MS;

  const remainingMs = Math.max(0, nextClaimTimestamp - currentTime);
  const is24hComplete = remainingMs === 0 && !isContractExpired && plan.status === 'active';

  // Format hours, minutes, seconds
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const formattedHours = String(hours).padStart(2, '0');
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');

  // Cycle progress percentage (how much of the 24 hours has elapsed)
  const elapsedInCycleMs = Math.min(CYCLE_MS, Math.max(0, CYCLE_MS - remainingMs));
  const cyclePercent = Math.min(100, Math.round((elapsedInCycleMs / CYCLE_MS) * 100));

  return (
    <div
      id={`plan-card-${plan.id}`}
      className={`bg-[#0e1628]/95 border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        is24hComplete
          ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                is24hComplete
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
              }`}
            >
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-snug">{plan.planName}</h3>
              <span className="text-[11px] font-mono text-slate-400">ID: {plan.id.substring(0, 8)}</span>
            </div>
          </div>
          <Badge status={isContractExpired ? 'completed' : plan.status} />
        </div>

        {/* Investment Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Invested Capital</span>
            <span className="text-base font-extrabold text-white font-mono mt-0.5 block">
              ${plan.investedAmount.toFixed(2)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Daily Return</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">
              +${plan.dailyIncome.toFixed(2)}/day
            </span>
          </div>
        </div>

        {/* Total Earned So Far */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between mb-4">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Total Earned To Date:
          </span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            +${plan.totalEarned.toFixed(2)}
          </span>
        </div>

        {/* 24-HOUR EARNING CLAIM SECTION */}
        <div className="mb-4">
          {isContractExpired ? (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-slate-400 block">
                Contract Term Completed
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Total generated return of ${plan.totalEarned.toFixed(2)} has been credited.
              </span>
            </div>
          ) : is24hComplete ? (
            /* 24-hour timer completed: SHOW CLAIM BUTTON */
            <div className="p-4 rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-950/20 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>24-Hour Cycle Complete!</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ready to Claim
                </span>
              </div>

              <div className="text-xs text-slate-300 flex items-center justify-between font-mono bg-slate-950/70 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-slate-400">Yield Due:</span>
                <span className="text-emerald-400 font-extrabold text-sm font-mono">
                  +${plan.dailyIncome.toFixed(2)}
                </span>
              </div>

              <button
                id={`claim-btn-${plan.id}`}
                onClick={() => onClaim(plan.id)}
                disabled={isClaiming}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isClaiming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Claiming Earning...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Claim Earning (+${plan.dailyIncome.toFixed(2)})</span>
                  </>
                )}
              </button>
              <div className="text-[10px] text-center text-slate-400">
                Clicking claim will credit funds immediately & start next 24h cycle
              </div>
            </div>
          ) : (
            /* 24-hour timer running: SHOW COUNTDOWN TIMER & LOCK STATUS */
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Next Earning Unlock</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-semibold">
                  <Lock className="w-3 h-3" />
                  <span>Cycle: {cyclePercent}%</span>
                </div>
              </div>

              {/* Digital Countdown Timer */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <div className="text-lg sm:text-xl font-mono font-extrabold text-amber-400">
                    {formattedHours}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Hours
                  </div>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <div className="text-lg sm:text-xl font-mono font-extrabold text-amber-400">
                    {formattedMins}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Minutes
                  </div>
                </div>
                <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                  <div className="text-lg sm:text-xl font-mono font-extrabold text-amber-400">
                    {formattedSecs}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Seconds
                  </div>
                </div>
              </div>

              {/* 24-Hour Cycle Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${cyclePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>24h Cycle Running</span>
                  <span className="text-amber-400 font-semibold">{cyclePercent}% Elapsed</span>
                </div>
              </div>

              {/* Locked Notice (User cannot claim early) */}
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="leading-tight">
                  Claim unlocks once the 24h timer reaches 00:00:00. Early claiming is restricted.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Overall Contract Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Overall Contract Duration</span>
            <span className="font-bold text-white font-mono">{contractPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${contractPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expiry & Contract Info */}
      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          Expires: {expiry.toLocaleDateString()}
        </span>
        <span className="font-mono text-emerald-400 font-semibold">
          Daily +${plan.dailyIncome.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export const MyPlansView: React.FC<MyPlansViewProps> = ({ setCurrentTab }) => {
  const { user, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);

  // Live 1-second ticker for accurate countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchUserPlans = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ userPlans: UserPlan[] }>('/api/user/plans');
      setUserPlans(data.userPlans || []);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load user plans:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserPlans();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Handle single plan claim
  const handleClaimPlan = async (userPlanId: string) => {
    if (claimingId) return;
    setClaimingId(userPlanId);
    try {
      const res = await apiRequest<{
        message: string;
        claimedAmount: number;
        userPlan: UserPlan;
      }>(`/api/plans/${userPlanId}/claim`, { method: 'POST' });

      success(res.message || 'Daily return claimed successfully!');

      // Update local state immediately
      setUserPlans((prev) =>
        prev.map((p) => (p.id === userPlanId ? { ...p, ...res.userPlan } : p))
      );

      // Refresh global balance
      await refreshProfile();
      fetchUserPlans();
    } catch (err: any) {
      toastError(err.message || 'Failed to claim daily return. Please try again.');
    } finally {
      setClaimingId(null);
    }
  };

  // Handle claim all ready plans
  const handleClaimAll = async () => {
    if (claimingAll) return;
    setClaimingAll(true);
    try {
      const res = await apiRequest<{
        message: string;
        claimedAmount: number;
        claimedCount: number;
      }>('/api/plans/claim-daily', { method: 'POST' });

      success(res.message || 'Successfully claimed daily returns!');
      await refreshProfile();
      fetchUserPlans();
    } catch (err: any) {
      toastError(err.message || 'No plans are currently ready to claim.');
    } finally {
      setClaimingAll(false);
    }
  };

  // Check how many plans are ready to claim
  const CYCLE_MS = 24 * 60 * 60 * 1000;
  const readyPlans = userPlans.filter((p) => {
    if (p.status !== 'active') return false;
    const lastRef = new Date(p.lastClaimDate || p.startDate).getTime();
    const nextTimestamp = p.nextClaimTime ? new Date(p.nextClaimTime).getTime() : lastRef + CYCLE_MS;
    return currentTime >= nextTimestamp;
  });

  const totalDailyReturn = userPlans
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + p.dailyIncome, 0);

  const totalInvested = userPlans
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + p.investedAmount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-amber-400" />
            My Active Plans
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your 24-hour earning countdown timers and claim daily ROI returns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {readyPlans.length > 0 && (
            <button
              id="claim-all-ready-btn"
              onClick={handleClaimAll}
              disabled={claimingAll}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {claimingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Claiming All...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Claim All Ready ({readyPlans.length})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setCurrentTab('plans')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Explore More Plans</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      {userPlans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Contracts
            </span>
            <div className="text-xl font-extrabold text-white font-mono mt-1">
              {userPlans.filter((p) => p.status === 'active').length}
            </div>
          </div>

          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Daily Yield
            </span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              +${totalDailyReturn.toFixed(2)}/d
            </div>
          </div>

          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Invested
            </span>
            <div className="text-xl font-extrabold text-white font-mono mt-1">
              ${totalInvested.toFixed(2)}
            </div>
          </div>

          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-xl p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ready to Claim
            </span>
            <div
              className={`text-xl font-extrabold font-mono mt-1 ${
                readyPlans.length > 0 ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {readyPlans.length} Plan{readyPlans.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading your active investments...
        </div>
      ) : userPlans.length === 0 ? (
        <div className="bg-[#0e1628] rounded-3xl border border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Active Plans Yet</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            You do not have any running investments. Explore our high-yield packages to start earning daily automated returns with 24-hour claim timers.
          </p>
          <button
            onClick={() => setCurrentTab('plans')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Browse Investment Tiers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userPlans.map((up) => (
            <PlanCardWithTimer
              key={up.id}
              plan={up}
              currentTime={currentTime}
              onClaim={handleClaimPlan}
              isClaiming={claimingId === up.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
