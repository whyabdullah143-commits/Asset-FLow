import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { AdminStats, DepositRequest, WithdrawalRequest } from '../../types';
import { Badge } from '../common/Badge';
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Receipt,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardProps {
  setCurrentTab: (tab: string) => void;
  onRefreshPendingCounts?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  setCurrentTab,
  onRefreshPendingCounts,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<DepositRequest[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminOverview = async () => {
    try {
      const [statsRes, depositsRes, withdrawalsRes] = await Promise.all([
        apiRequest<{ stats: AdminStats }>('/api/admin/stats'),
        apiRequest<{ deposits: DepositRequest[] }>('/api/admin/deposits'),
        apiRequest<{ withdrawals: WithdrawalRequest[] }>('/api/admin/withdrawals'),
      ]);

      setStats(statsRes.stats);
      setPendingDeposits((depositsRes.deposits || []).filter((d) => d.status === 'pending'));
      setPendingWithdrawals((withdrawalsRes.withdrawals || []).filter((w) => w.status === 'pending'));

      if (onRefreshPendingCounts) onRefreshPendingCounts();
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-[#0e1628] border border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Master Operations Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Administrative Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Real-time financial solvency metrics, user audits, gateway approvals, and system-wide configurations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('admin-deposits')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Review Deposits</span>
              {pendingDeposits.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[10px]">
                  {pendingDeposits.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('admin-withdrawals')}
              className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Payout Approvals</span>
              {pendingWithdrawals.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-rose-600 text-[10px]">
                  {pendingWithdrawals.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Investors</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {stats?.totalUsers || 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>Active Subscribers:</span>
            <span className="text-emerald-400 font-bold">{stats?.activeUsers || 0}</span>
          </div>
        </div>

        {/* Total Deposits */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Deposits</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            ${(stats?.totalDeposits || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>Pending Review:</span>
            <span className="text-amber-400 font-bold">${(stats?.pendingDeposits || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Total Withdrawals */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Disbursed Payouts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            ${(stats?.totalWithdrawals || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>Pending Payouts:</span>
            <span className="text-rose-400 font-bold">
              ${(stats?.pendingWithdrawals || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* System Solvency Reserve */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Net Vault</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            ${(stats?.platformReserve || 0).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>Active Contract Tiers:</span>
            <span className="text-cyan-400 font-bold">{stats?.activePlansCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Two Columns: Pending Deposits & Pending Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Deposits Queue */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Pending Deposits Queue</h2>
            </div>
            <button
              onClick={() => setCurrentTab('admin-deposits')}
              className="text-xs text-amber-400 font-semibold hover:underline"
            >
              View Full Queue ({pendingDeposits.length})
            </button>
          </div>

          <div className="space-y-3">
            {pendingDeposits.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No pending deposits awaiting review.
              </div>
            ) : (
              pendingDeposits.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{d.userName}</div>
                    <div className="text-slate-400 text-[11px]">
                      {d.methodName} • TID:{' '}
                      <span className="font-mono text-amber-300">{d.transactionRef}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      +${d.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => setCurrentTab('admin-deposits')}
                      className="text-[11px] text-amber-400 hover:underline font-semibold mt-0.5 block"
                    >
                      Audit & Approve →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Withdrawals Queue */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Pending Payouts Queue</h2>
            </div>
            <button
              onClick={() => setCurrentTab('admin-withdrawals')}
              className="text-xs text-rose-400 font-semibold hover:underline"
            >
              View All Payouts ({pendingWithdrawals.length})
            </button>
          </div>

          <div className="space-y-3">
            {pendingWithdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No pending withdrawals awaiting disbursement.
              </div>
            ) : (
              pendingWithdrawals.slice(0, 4).map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{w.userName}</div>
                    <div className="text-slate-400 text-[11px]">
                      {w.methodName} • {w.accountTitle} ({w.accountNumber})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-rose-400 text-sm">
                      ${w.netAmount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => setCurrentTab('admin-withdrawals')}
                      className="text-[11px] text-rose-400 hover:underline font-semibold mt-0.5 block"
                    >
                      Audit & Disburse →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
