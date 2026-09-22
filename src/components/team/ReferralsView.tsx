import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { ReferralMember, TeamMilestone } from '../../types';
import {
  Users,
  Award,
  DollarSign,
  Copy,
  CheckCircle2,
  Share2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  UserCheck,
  Check,
} from 'lucide-react';

interface ReferralsViewProps {
  setCurrentTab?: (tab: string) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({ setCurrentTab }) => {
  const { user, balance, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [members, setMembers] = useState<ReferralMember[]>([]);
  const [milestones, setMilestones] = useState<TeamMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchTeamData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ members: ReferralMember[]; milestones: TeamMilestone[] }>(
        '/api/referrals/team'
      );
      setMembers(data.members || []);
      setMilestones(data.milestones || []);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load team data:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeamData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const referralUrl = `${window.location.origin}/?ref=${user?.referralCode || ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    success('Referral invitation link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join AssetFlow Investment Platform',
        text: `Use my referral code ${user?.referralCode} to sign up on AssetFlow and earn automated daily ROI!`,
        url: referralUrl,
      });
    } else {
      handleCopy();
    }
  };

  const activeMembersCount = members.filter((m) => m.hasActivePlan || !!m.activePlan).length;

  const handleClaimMilestone = async (milestoneId: string) => {
    setClaimingId(milestoneId);
    try {
      const res = await apiRequest<{ message: string; bonusAmount: number }>('/api/referrals/claim-milestone', {
        method: 'POST',
        body: JSON.stringify({ milestoneId }),
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      success(res.message || `Milestone bonus +$${res.bonusAmount.toFixed(2)} credited!`);
      await refreshProfile();
      await fetchTeamData();
    } catch (err: any) {
      error(err.message || 'Failed to claim milestone');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-400" />
            Team Network & Milestone Ranks
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Build your partner network. Earn 6.00% direct plan activation commissions and claim instant cash milestone rewards (10, 20, 30, 50, 100+ active members).
          </p>
        </div>

        {setCurrentTab && (
          <button
            onClick={() => setCurrentTab('salary')}
            className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start shadow-sm"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Open Weekly Salary Page →</span>
          </button>
        )}
      </div>

      {/* Share / Invitation Link Card */}
      <div className="bg-gradient-to-r from-[#0d162a] via-[#101c36] to-[#142345] border border-blue-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 inline-block mb-3">
              Your Unique Referral Credentials
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Share Your Referral Link
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Anyone registering with your link or entering code{' '}
              <strong className="text-white font-mono">{user?.referralCode}</strong> is placed directly in your frontline network.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Referral Link'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4 text-blue-400" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Link Box Display */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono text-slate-300">
          <span className="truncate">{referralUrl}</span>
          <span className="text-amber-400 font-bold shrink-0">Code: {user?.referralCode}</span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Team Members</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{members.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total registered referrals</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Plan Members</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {activeMembersCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Investors with running yield</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Commission Earned</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            ${(balance?.referralCommission || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Instant 6% direct earnings</p>
        </div>
      </div>

      {/* Team Milestone Rewards Section (Spec Requirement) */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Referral Rank Milestones & Instant Dollar Rewards
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Level up your leadership rank (10, 20, 30, 50, 100 members) and claim one-time instant dollar cash bonuses.
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            Active Members: <strong className="text-emerald-400 font-mono">{activeMembersCount}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((m) => {
            const current = activeMembersCount;
            const target = m.requiredActiveMembers ?? m.requiredMembers ?? 1;
            const progressPercent = Math.min(100, Math.round((current / target) * 100));
            const isEligible = current >= target;
            const isClaimed = !!m.isClaimed;
            const reward = m.bonusReward ?? m.rewardAmount ?? 0;

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isClaimed
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-75'
                    : isEligible
                    ? 'bg-gradient-to-b from-amber-500/10 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{m.title}</span>
                    <span className="text-xs font-mono font-extrabold text-amber-400">
                      +${reward.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{m.description}</p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        Progress: {Math.min(current, target)} / {target} Active
                      </span>
                      <span className="font-bold font-mono">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isEligible ? 'bg-amber-400' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                {isClaimed ? (
                  <button
                    disabled
                    className="w-full py-2 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Claimed</span>
                  </button>
                ) : isEligible ? (
                  <button
                    onClick={() => handleClaimMilestone(m.id)}
                    disabled={claimingId === m.id}
                    className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {claimingId === m.id ? (
                      'Processing...'
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Claim ${reward.toFixed(2)} Bonus</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-semibold text-xs text-center">
                    Requires {Math.max(0, target - current)} more active
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Referred Members Table */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Referred Team Members</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              List of partners registered through your referral network.
            </p>
          </div>
          <span className="text-xs text-slate-400">{members.length} Members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Member Name</th>
                <th className="pb-3 px-4">Username</th>
                <th className="pb-3 px-4">Joined Date</th>
                <th className="pb-3 px-4">Plan Status</th>
                <th className="pb-3 px-4">Total Invested</th>
                <th className="pb-3 pl-4 text-right">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No referred members yet. Share your invitation link to build your team.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-white">{m.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">@{m.username}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.hasActivePlan || m.activePlan ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {m.activePlanName || m.activePlan || 'Active'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white">
                      ${(m.totalInvested ?? m.totalDeposit ?? 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono font-bold text-amber-400">
                      +${(m.commissionEarned ?? 0).toFixed(2)}
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
