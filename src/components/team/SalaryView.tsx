import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import { SalaryTier, SalaryPayout } from '../../types';
import {
  DollarSign,
  Award,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Gift,
  Lock,
  Copy,
  RefreshCw,
  Calendar,
  Check,
} from 'lucide-react';

interface SalaryStatusResponse {
  activeCount: number;
  activeMembersCount?: number;
  registeredCount: number;
  totalMembersCount?: number;
  peakTeamCount?: number;
  tiers: SalaryTier[];
  highestQualifyingTier: SalaryTier | null;
  highestQualifiedTier?: SalaryTier | null;
  isPermanentlyUnlocked?: boolean;
  canClaim: boolean;
  cooldownEndsAt: string | null;
  nextClaimDate?: string | null;
  remainingSeconds?: number;
  msRemaining?: number;
  daysLeft: number;
  cycleDays?: number;
  totalSalaryEarned?: number;
  payouts: SalaryPayout[];
}

export const SalaryView: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [salaryData, setSalaryData] = useState<SalaryStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [copiedRef, setCopiedRef] = useState(false);

  // Live 1-second interval ticker for accurate 7-day countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSalaryStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<SalaryStatusResponse>('/api/salary/status');
      setSalaryData(data);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load salary status:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSalaryStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleClaimSalary = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await apiRequest<{
        message: string;
        salaryPaid?: number;
        payout?: SalaryPayout;
        nextClaimDate?: string;
      }>('/api/salary/claim', {
        method: 'POST',
      });

      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
      });

      const amount = res.salaryPaid || res.payout?.weeklySalary || currentTier?.weeklySalary || 0;
      success(res.message || `Weekly salary of +$${amount.toFixed(2)} credited to your wallet!`);

      // Refresh balance & profile
      await refreshProfile();
      await fetchSalaryStatus();
    } catch (err: any) {
      toastError(err.message || 'Failed to claim weekly salary. 7-day cycle active.');
    } finally {
      setClaiming(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;
    navigator.clipboard.writeText(link);
    setCopiedRef(true);
    success('Referral link copied! Invite members to unlock salary boxes.');
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const activeMembers = salaryData?.peakTeamCount || salaryData?.activeCount || salaryData?.activeMembersCount || 0;
  const tiers = salaryData?.tiers || [];
  const currentTier = salaryData?.highestQualifyingTier || salaryData?.highestQualifiedTier || null;
  const payouts = salaryData?.payouts || [];
  const totalEarned = salaryData?.totalSalaryEarned ?? payouts.reduce((sum, p) => sum + p.weeklySalary, 0);

  // 7-Day Cycle Calculation (7 days = 604,800,000 ms)
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const nextClaimTime = salaryData?.nextClaimDate ? new Date(salaryData.nextClaimDate).getTime() : 0;
  const remainingMs = Math.max(0, nextClaimTime - currentTime);
  const is7dComplete = !!currentTier && (remainingMs === 0 || salaryData?.canClaim === true);

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (1000 * 60 * 60));
  const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const formattedDays = String(days).padStart(2, '0');
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMins = String(mins).padStart(2, '0');
  const formattedSecs = String(secs).padStart(2, '0');

  const elapsedInWeekMs = Math.min(WEEK_MS, Math.max(0, WEEK_MS - remainingMs));
  const cyclePercent = Math.min(100, Math.round((elapsedInWeekMs / WEEK_MS) * 100));

  const firstTier = tiers[0] || { requiredMembers: 10, weeklySalary: 30 };
  const membersNeededForFirstTier = Math.max(0, firstTier.requiredMembers - activeMembers);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            Weekly Team Salary
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete the member task once to unlock guaranteed weekly salary. Claim every 7 days without recruiting again!
          </p>
        </div>

        {currentTier && (
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Unlocked Salary</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                ${currentTier.weeklySalary.toFixed(2)}/wk
              </span>
            </div>
            {is7dComplete ? (
              <button
                onClick={handleClaimSalary}
                disabled={claiming}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {claiming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-3.5 h-3.5" />
                    <span>Claim Now</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5 font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Next in {days}d {hours}h</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Guarantee Highlights Bar: 1-Time Recruitment Guarantee */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0e1628]/90 border border-emerald-500/30 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Join Members Only ONCE</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono">
                1-Time Task
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Once you invite 10 members, your salary plan unlocks <strong>permanently for life</strong>. You do NOT need to invite members again every week!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1628]/90 border border-slate-800 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">7-Day Recurring Timer</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              After each claim, an exact 7-day timer starts. As soon as the 7-day cycle completes, you can claim your weekly salary again!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1628]/90 border border-slate-800 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Auto Tier Upgrades</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              When your total team grows to 20, 30, or 50 members, your weekly salary automatically jumps to higher payout brackets for life!
            </p>
          </div>
        </div>
      </div>

      {/* MAIN 7-DAY SALARY CLAIM & COUNTDOWN PANEL */}
      {currentTier ? (
        <div
          id="weekly-salary-timer-panel"
          className={`rounded-3xl p-6 sm:p-8 border transition-all duration-300 ${
            is7dComplete
              ? 'bg-gradient-to-b from-emerald-950/40 via-[#0e1628] to-[#0e1628] border-emerald-500/60 shadow-xl shadow-emerald-500/10'
              : 'bg-[#0e1628]/95 border-slate-800'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Permanent Active Salary Tier
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentTier.title}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                ${currentTier.weeklySalary.toFixed(2)} Weekly Salary Payout
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Achieved with {currentTier.requiredMembers}+ team members. This plan is permanently unlocked for your account. You can claim every 7 days.
              </p>
            </div>

            {/* Quick status pill */}
            <div className="self-start md:self-auto">
              {is7dComplete ? (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>7-Day Cycle Complete • Ready!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>7-Day Cycle in Progress</span>
                </div>
              )}
            </div>
          </div>

          {/* Conditional Claim vs Timer Box */}
          {is7dComplete ? (
            /* READY TO CLAIM */
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-5 h-5 text-emerald-400 animate-bounce" />
                  <span>Your Weekly Salary is Ready for Immediate Collection!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Click the button below to credit <strong className="text-emerald-300 font-mono">+${currentTier.weeklySalary.toFixed(2)}</strong> directly to your main withdrawable balance. Next 7-day cycle will start immediately.
                </p>
              </div>

              <button
                id="claim-weekly-salary-btn"
                onClick={handleClaimSalary}
                disabled={claiming}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {claiming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    <span>Claim Salary (+${currentTier.weeklySalary.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 7-DAY COUNTDOWN TIMER RUNNING */
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Next Weekly Salary Unlock Countdown
                    </span>
                  </div>
                  <span className="text-xs font-mono text-amber-400 font-semibold">
                    7-Day Cycle: {cyclePercent}% Elapsed
                  </span>
                </div>

                {/* Digital Clock Grid (Days : Hours : Mins : Secs) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-xl mx-auto py-2">
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
                      {formattedDays}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Days
                    </div>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
                      {formattedHours}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Hours
                    </div>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
                      {formattedMins}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Minutes
                    </div>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
                      {formattedSecs}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                      Seconds
                    </div>
                  </div>
                </div>

                {/* 7-Day Cycle Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${cyclePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Cycle Start</span>
                    <span>7 Days (168 Hours) Total</span>
                    <span>Unlock Date: {salaryData?.nextClaimDate ? new Date(salaryData.nextClaimDate).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>

                {/* Lock restriction explanation */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-white">Strict 7-Day Waiting Period:</strong> Weekly salary claims are regulated by the 7-day timer. Early claims are restricted by the system until the countdown reaches 00d:00h:00m:00s. You do not need to add more members to claim again.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TASK INCOMPLETE: 10 MEMBERS TASK UNLOCK PANEL */
        <div className="bg-[#0e1628]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Milestone Task: Complete 1 Time For Life
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-amber-400" />
                Invite 10 Members to Unlock Weekly Salary!
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Just build a team of 10 members once. After that, your weekly salary is unlocked permanently and you can claim every 7 days without needing to recruit again.
              </p>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
            >
              {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRef ? 'Link Copied!' : 'Copy Invite Link'}</span>
            </button>
          </div>

          {/* Progress bar towards 10 members */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                Box 1 Qualification Progress (10 Members Task)
              </span>
              <span className="font-mono font-bold text-amber-400">
                {activeMembers} / 10 Members ({Math.min(100, Math.round((activeMembers / 10) * 100))}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeMembers / 10) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Current Team: {activeMembers}</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {membersNeededForFirstTier > 0
                  ? `Only ${membersNeededForFirstTier} more member${membersNeededForFirstTier === 1 ? '' : 's'} needed!`
                  : 'Task Complete! Salary Unlocked!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Your Team Count</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{activeMembers}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total qualifying team referrals</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Salary Claimed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            ${totalEarned.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All-time recurring weekly earnings</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Current Salary Box</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-amber-400 truncate">
            {currentTier ? `${currentTier.title.split('-')[0]} ($${currentTier.weeklySalary}/wk)` : 'Unranked'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {is7dComplete
              ? 'Ready to claim today!'
              : currentTier
              ? `7-day cycle active (${days}d remaining)`
              : 'Complete Box 1 (10 members)'}
          </p>
        </div>
      </div>

      {/* Salary Slabs / Boxes Breakdown */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Weekly Salary Boxes & Milestones
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Join members once to complete a box. Once achieved, that box remains permanently unlocked for life.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            Current Achieved Team: <strong className="text-emerald-400 font-mono">{activeMembers} members</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading salary boxes...
            </div>
          ) : tiers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              No salary boxes currently active.
            </div>
          ) : (
            tiers.map((t, idx) => {
              const target = t.requiredMembers;
              const isQualified = !!t.isPermanentlyUnlocked || !!t.isQualified || activeMembers >= target;
              const isCurrent = currentTier?.id === t.id;
              const progress = Math.min(100, Math.round((activeMembers / target) * 100));

              return (
                <div
                  key={t.id}
                  id={`salary-box-${t.id}`}
                  className={`p-6 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                    isCurrent
                      ? 'bg-gradient-to-b from-emerald-500/15 via-slate-900 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/40'
                      : isQualified
                      ? 'bg-gradient-to-b from-teal-500/10 via-slate-900 to-slate-900 border-teal-500/40'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    {/* Box Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Box {idx + 1}
                          </span>
                          <h3 className="font-bold text-white text-base">{t.title}</h3>
                        </div>
                        <span className="text-xs text-slate-400 font-semibold mt-1 block">
                          Target: {target} Team Members (1-Time)
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-2xl font-mono font-black text-emerald-400">
                          ${t.weeklySalary.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                          / every 7 days
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      {t.description || `Build ${target} team members once to receive guaranteed $${t.weeklySalary.toFixed(2)} weekly recurring payroll every 7 days.`}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Box Completion Progress</span>
                        <span className="font-mono font-bold text-slate-200">
                          {Math.min(activeMembers, target)} / {target} ({progress}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isQualified
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Box Footer Status */}
                  <div className="pt-3.5 mt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    {isQualified ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Permanently Unlocked!
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Need <strong className="text-white font-mono">{Math.max(0, target - activeMembers)}</strong> more member(s)
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isQualified
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCurrent ? 'Active Salary' : isQualified ? 'Achieved' : 'Locked'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Salary Disbursement History */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Weekly Salary Claims History
          </h2>
          <span className="text-xs text-slate-400">{payouts.length} Payouts</span>
        </div>

        {payouts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No salary claims recorded yet. Complete Box 1 (10 members) to claim your first weekly payout!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-3.5">Tier Plan</th>
                  <th className="p-3.5">Amount Credited</th>
                  <th className="p-3.5">Qualifying Members</th>
                  <th className="p-3.5">Date Claimed</th>
                  <th className="p-3.5">Transaction TID</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">{p.tierTitle}</td>
                    <td className="p-3.5 font-mono font-extrabold text-emerald-400 text-sm">
                      +${p.weeklySalary.toFixed(2)}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {p.memberCount} members
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(p.claimedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono text-amber-400/90 text-[11px]">
                      {p.transactionRef}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
