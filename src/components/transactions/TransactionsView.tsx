import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { Transaction } from '../../types';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchTransactions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ transactions: Transaction[] }>('/api/transactions/my');
      setTransactions(data.transactions || []);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load transactions:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || tx.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || tx.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Receipt className="w-6 h-6 text-amber-400" />
          Financial Transactions Ledger
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete transparent, auditable history of your deposits, withdrawals, daily yields, and referral bonuses.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by description, reference, or TX ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500/60"
          />
        </div>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full md:w-48 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
        >
          <option value="all">All Event Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="plan_activation">Plan Activations</option>
          <option value="daily_roi">Daily ROI Yields</option>
          <option value="referral_commission">Referral Commissions</option>
          <option value="team_reward">Team Milestone Rewards</option>
          <option value="promo_reward">Promo Code Rewards</option>
          <option value="admin_adjustment">Admin Adjustments</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full md:w-36 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance After</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No matching transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      #{tx.id.substring(0, 10)}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ${tx.balanceAfter.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
