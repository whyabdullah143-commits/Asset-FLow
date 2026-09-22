import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { SalaryTier, SalaryPayout, User } from '../../types';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  Send,
  Search,
  CheckCircle2,
} from 'lucide-react';

export const AdminSalaryView: React.FC = () => {
  const { success, error } = useToast();

  const [tiers, setTiers] = useState<SalaryTier[]>([]);
  const [payouts, setPayouts] = useState<SalaryPayout[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'payouts' | 'manual'>('tiers');

  // Tier Modal (Create / Edit)
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SalaryTier | null>(null);
  const [title, setTitle] = useState('');
  const [requiredMembers, setRequiredMembers] = useState('10');
  const [weeklySalary, setWeeklySalary] = useState('25');
  const [condition, setCondition] = useState<'active_plan' | 'registered'>('active_plan');
  const [description, setDescription] = useState('');
  const [savingTier, setSavingTier] = useState(false);

  // Manual Salary Payout Form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualTierTitle, setManualTierTitle] = useState('Special Executive Weekly Salary');
  const [manualNotes, setManualNotes] = useState('');
  const [payingManual, setPayingManual] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const fetchData = async () => {
    try {
      const [tiersRes, payoutsRes, usersRes] = await Promise.all([
        apiRequest<{ tiers: SalaryTier[] }>('/api/admin/salary/tiers'),
        apiRequest<{ payouts: SalaryPayout[] }>('/api/admin/salary/payouts'),
        apiRequest<{ users: User[] }>('/api/admin/users'),
      ]);

      setTiers(tiersRes.tiers || []);
      setPayouts(payoutsRes.payouts || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error('Failed to load salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateTier = () => {
    setEditingTier(null);
    setTitle('');
    setRequiredMembers('10');
    setWeeklySalary('25');
    setCondition('active_plan');
    setDescription('');
    setIsTierModalOpen(true);
  };

  const openEditTier = (t: SalaryTier) => {
    setEditingTier(t);
    setTitle(t.title);
    setRequiredMembers(t.requiredMembers.toString());
    setWeeklySalary(t.weeklySalary.toString());
    setCondition(t.condition);
    setDescription(t.description || '');
    setIsTierModalOpen(true);
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const req = parseInt(requiredMembers, 10);
    const sal = parseFloat(weeklySalary);

    if (!title.trim() || isNaN(req) || isNaN(sal) || sal <= 0) {
      error('Please provide a valid title, member count, and positive salary amount.');
      return;
    }

    setSavingTier(true);
    try {
      if (editingTier) {
        await apiRequest(`/api/admin/salary/tiers/${editingTier.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            requiredMembers: req,
            weeklySalary: sal,
            condition,
            description: description.trim() || `Reach ${req} active team members to receive $${sal.toFixed(2)} weekly.`,
          }),
        });
        success(`Salary tier "${title}" updated successfully!`);
      } else {
        await apiRequest('/api/admin/salary/tiers', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            requiredMembers: req,
            weeklySalary: sal,
            condition,
            description: description.trim() || `Reach ${req} active team members to receive $${sal.toFixed(2)} weekly.`,
          }),
        });
        success(`New salary tier "${title}" created!`);
      }

      setIsTierModalOpen(false);
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to save salary tier.');
    } finally {
      setSavingTier(false);
    }
  };

  const handleDeleteTier = async (id: string, tierTitle: string) => {
    if (!confirm(`Are you sure you want to delete salary tier "${tierTitle}"?`)) return;
    try {
      await apiRequest(`/api/admin/salary/tiers/${id}`, { method: 'DELETE' });
      success(`Salary tier removed.`);
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to delete salary tier.');
    }
  };

  const handleManualPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (!selectedUserId || isNaN(amt) || amt <= 0) {
      error('Please choose a user and enter a valid positive salary amount.');
      return;
    }

    setPayingManual(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/admin/salary/pay-manual', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUserId,
          amount: amt,
          tierTitle: manualTierTitle.trim() || 'Manual Weekly Salary',
          notes: manualNotes.trim(),
        }),
      });

      success(res.message || `Salary of $${amt.toFixed(2)} credited!`);
      setSelectedUserId('');
      setManualAmount('');
      setManualNotes('');
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to process manual salary payout.');
    } finally {
      setPayingManual(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q)
    );
  });

  const totalPaidOut = payouts.reduce((sum, p) => sum + p.weeklySalary, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-rose-400" />
            Weekly Team Salary Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure weekly recurring salaries based on active team size (e.g. 10 members, 20 members), edit salary amounts, delete tiers, or issue manual payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateTier}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salary Tier</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Salary Slabs</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">{tiers.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Configured weekly reward slabs</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Weekly Salaries Paid</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            ${totalPaidOut.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all team leaders</p>
        </div>

        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Claims Processed</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">{payouts.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Weekly salary disbursements</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'tiers'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Salary Slabs & Tiers ({tiers.length})
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'payouts'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Disbursement Ledger ({payouts.length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'manual'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Issue Manual Salary
        </button>
      </div>

      {/* Tab 1: Salary Slabs & Tiers */}
      {activeTab === 'tiers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Users with qualifying team members can claim this payout every 7 days.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-500">Loading salary tiers...</div>
            ) : tiers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                No salary tiers configured yet. Click "Add Salary Tier" above to create one.
              </div>
            ) : (
              tiers.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#0e1628]/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">{t.title}</h3>
                        <span className="text-[11px] text-slate-400">
                          {t.condition === 'active_plan' ? 'Requires Active Plan Members' : 'Requires Registered Members'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-mono font-black text-emerald-400">
                          ${t.weeklySalary.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                          per week
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-4">{t.description}</p>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        Target Team:
                      </span>
                      <span className="font-mono font-bold text-white text-sm">
                        {t.requiredMembers} Active Members
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditTier(t)}
                      className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Amount</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTier(t.id, t.title)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Disbursement Ledger */}
      {activeTab === 'payouts' && (
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Salary Payouts History
            </h2>
            <span className="text-xs text-slate-400">{payouts.length} total payouts recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Tier / Plan</th>
                  <th className="p-3.5">Weekly Amount</th>
                  <th className="p-3.5">Team Size</th>
                  <th className="p-3.5">Claimed Date</th>
                  <th className="p-3.5">Reference ID</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No salary claims recorded yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{p.userName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.userEmail}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-300">{p.tierTitle}</td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-400">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Manual Salary Issue */}
      {activeTab === 'manual' && (
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-rose-400" />
              Pay Weekly Salary Directly
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Credit a weekly salary immediately to any user account balance, with automated ledger entry and notifications.
            </p>
          </div>

          <form onSubmit={handleManualPayout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Beneficiary User
              </label>
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter users by name, email, or username..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
                />
              </div>

              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              >
                <option value="">-- Choose User --</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username}) - {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Salary Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    required
                    className="w-full pl-7 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Designation / Tier Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Silver Leader Weekly Salary"
                  value={manualTierTitle}
                  onChange={(e) => setManualTierTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Notes <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Reason or special bonus explanation"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <button
              type="submit"
              disabled={payingManual}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {payingManual ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Disburse Weekly Salary Immediately</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Create or Edit Salary Tier */}
      <Modal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        title={editingTier ? 'Edit Salary Tier' : 'Create New Salary Tier'}
        subtitle="Set the required team members and weekly dollar payout amount."
      >
        <form onSubmit={handleSaveTier} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tier Title</label>
            <input
              type="text"
              placeholder="e.g. 10 Members Weekly Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Required Members
              </label>
              <input
                type="number"
                value={requiredMembers}
                onChange={(e) => setRequiredMembers(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Weekly Salary ($ USD)
              </label>
              <input
                type="number"
                step="any"
                value={weeklySalary}
                onChange={(e) => setWeeklySalary(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Qualification Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            >
              <option value="active_plan">Members with Active Investment Plans</option>
              <option value="registered">Total Registered Referral Signups</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="Short description for the user"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsTierModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTier}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              {savingTier ? 'Saving...' : editingTier ? 'Update Tier' : 'Create Tier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
