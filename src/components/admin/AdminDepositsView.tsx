import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { DepositRequest } from '../../types';
import {
  ArrowDownToLine,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
} from 'lucide-react';

export const AdminDepositsView: React.FC = () => {
  const { success, error } = useToast();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [rejectingDeposit, setRejectingDeposit] = useState<DepositRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDeposits = async () => {
    try {
      const data = await apiRequest<{ deposits: DepositRequest[] }>('/api/admin/deposits');
      setDeposits(data.deposits || []);
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleApprove = async (dep: DepositRequest) => {
    if (!confirm(`Confirm approval of $${dep.amount.toFixed(2)} deposit for ${dep.userName}?`)) {
      return;
    }
    setProcessing(true);
    try {
      await apiRequest(`/api/admin/deposits/${dep.id}/approve`, { method: 'POST' });
      success(`Deposit #${dep.id.substring(0, 8)} approved. User balance credited!`);
      setSelectedDeposit(null);
      await fetchDeposits();
    } catch (err: any) {
      error(err.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDeposit) return;
    if (!rejectionReason.trim()) {
      error('Please provide a reason for rejecting the deposit.');
      return;
    }

    setProcessing(true);
    try {
      await apiRequest(`/api/admin/deposits/${rejectingDeposit.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      success(`Deposit #${rejectingDeposit.id.substring(0, 8)} marked as rejected.`);
      setRejectingDeposit(null);
      setRejectionReason('');
      setSelectedDeposit(null);
      await fetchDeposits();
    } catch (err: any) {
      error(err.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = deposits.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch =
      d.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.transactionRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.methodName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ArrowDownToLine className="w-6 h-6 text-amber-400" />
            Deposit Requests & Gateway Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit inbound transaction reference numbers (TIDs), approve to credit balance, or decline invalid submissions.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
          >
            <option value="pending">Pending Review Only</option>
            <option value="approved">Approved Deposits</option>
            <option value="rejected">Rejected Deposits</option>
            <option value="all">All Deposits</option>
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
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Reference / TID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading deposit records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No matching deposit requests found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{d.userName}</td>
                    <td className="py-3 px-4 text-slate-300">{d.methodName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${d.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300 font-semibold break-all">
                      {d.transactionRef}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={d.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(d)}
                            disabled={processing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectingDeposit(d);
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
                        <span className="text-xs text-slate-500 capitalize">Audited</span>
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
        isOpen={rejectingDeposit !== null}
        onClose={() => setRejectingDeposit(null)}
        title="Decline Deposit Request"
        subtitle={rejectingDeposit ? `User: ${rejectingDeposit.userName} • TID: ${rejectingDeposit.transactionRef}` : ''}
      >
        {rejectingDeposit && (
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              Please enter the reason for rejection (e.g. TID not found in bank statement, amount mismatch, duplicate submission). The user will be notified immediately.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Invalid Transaction ID, funds not received in official Easypaisa account..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingDeposit(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-all"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
