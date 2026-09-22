import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { WithdrawalRequest } from '../../types';
import { ArrowUpFromLine, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';

export const AdminWithdrawalsView: React.FC = () => {
  const { success, error } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Reject modal
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = async () => {
    try {
      const data = await apiRequest<{ withdrawals: WithdrawalRequest[] }>('/api/admin/withdrawals');
      setWithdrawals(data.withdrawals || []);
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const handleApprove = async (w: WithdrawalRequest) => {
    if (!confirm(`Confirm payout disbursement of $${w.netAmount.toFixed(2)} to ${w.accountTitle}?`)) {
      return;
    }
    setProcessing(true);
    try {
      await apiRequest(`/api/admin/withdrawals/${w.id}/approve`, { method: 'POST' });
      success(`Withdrawal #${w.id.substring(0, 8)} disbursed and marked as completed!`);
      await fetchWithdrawals();
    } catch (err: any) {
      error(err.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingWithdrawal) return;
    if (!rejectionReason.trim()) {
      error('Please provide a reason for rejecting the withdrawal.');
      return;
    }

    setProcessing(true);
    try {
      await apiRequest(`/api/admin/withdrawals/${rejectingWithdrawal.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      success(
        `Withdrawal #${rejectingWithdrawal.id.substring(0, 8)} rejected. $${rejectingWithdrawal.amount.toFixed(2)} refunded to user balance!`
      );
      setRejectingWithdrawal(null);
      setRejectionReason('');
      await fetchWithdrawals();
    } catch (err: any) {
      error(err.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = withdrawals.filter((w) => {
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesSearch =
      w.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.accountTitle && w.accountTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.accountNumber && w.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.accountDetails && w.accountDetails.toLowerCase().includes(searchTerm.toLowerCase())) ||
      w.methodName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ArrowUpFromLine className="w-6 h-6 text-rose-400" />
            Withdrawal Approvals & Payout Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit requested disbursements. Approving completes the payout; rejecting safely refunds the user's reserved capital.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500/60"
          >
            <option value="pending">Pending Payouts</option>
            <option value="approved">Completed Payouts</option>
            <option value="rejected">Rejected (Refunded)</option>
            <option value="all">All Withdrawals</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Gross Amount</th>
                <th className="py-3 px-4">Net Payout</th>
                <th className="py-3 px-4">Beneficiary Details</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading withdrawal records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No matching withdrawal requests found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{w.userName}</td>
                    <td className="py-3 px-4 text-slate-300">{w.methodName}</td>
                    <td className="py-3 px-4 font-mono text-white">${w.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      ${w.netAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">{w.accountTitle || w.accountDetails}</div>
                      {w.accountNumber && (
                        <div className="font-mono text-slate-400 text-xs break-all">
                          {w.accountNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={w.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {w.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(w)}
                            disabled={processing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectingWithdrawal(w);
                              setRejectionReason('');
                            }}
                            disabled={processing}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 capitalize">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectingWithdrawal !== null}
        onClose={() => setRejectingWithdrawal(null)}
        title="Reject Withdrawal & Refund Balance"
        subtitle={rejectingWithdrawal ? `Beneficiary: ${rejectingWithdrawal.accountTitle || rejectingWithdrawal.accountDetails} • Amount: $${rejectingWithdrawal.amount.toFixed(2)}` : ''}
      >
        {rejectingWithdrawal && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
              <strong>Automatic Refund Guarantee:</strong> Rejecting this request will immediately refund ${rejectingWithdrawal.amount.toFixed(2)} back to {rejectingWithdrawal.userName}'s active balance and create an audit log.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rejection Reason (Sent to User)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Beneficiary account number title mismatch with CNIC/KYC, invalid wallet format..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingWithdrawal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all"
              >
                {processing ? 'Refunding...' : 'Confirm Rejection & Refund'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
