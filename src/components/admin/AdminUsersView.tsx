import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { User, UserBalance } from '../../types';
import {
  Users,
  Search,
  DollarSign,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MinusCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface UserListItem extends User {
  balance?: UserBalance;
}

export const AdminUsersView: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Balance adjustment modal
  const [adjustModalUser, setAdjustModalUser] = useState<UserListItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Password update modal
  const [passwordModalUser, setPasswordModalUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest<{ users: UserListItem[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (user: UserListItem) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      await apiRequest(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      success(`User ${user.username} is now ${newStatus}.`);
      await fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to update user status');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser) return;
    const amt = parseFloat(adjustAmount);
    if (!amt || amt <= 0) {
      error('Please enter a positive amount');
      return;
    }
    if (!adjustReason.trim()) {
      error('Please enter an audit reason for this adjustment');
      return;
    }

    setAdjusting(true);
    try {
      await apiRequest(`/api/admin/users/${adjustModalUser.id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          type: adjustType,
          reason: adjustReason.trim(),
        }),
      });

      success(`Successfully ${adjustType === 'credit' ? 'credited' : 'debited'} $${amt.toFixed(2)}.`);
      setAdjustModalUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchUsers();
    } catch (err: any) {
      error(err.message || 'Balance adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      error('New password must be at least 4 characters long');
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest(`/api/admin/users/${passwordModalUser.id}/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          newPassword: newPassword.trim(),
        }),
      });

      success(`Password for @${passwordModalUser.username} (${passwordModalUser.name}) updated successfully.`);
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to update user password');
    } finally {
      setSavingPassword(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-rose-400" />
            Investor Accounts Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit user balances, freeze fraudulent accounts, and execute manual ledger corrections.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, @user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/60"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Ref Code</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading accounts directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">@{u.username}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{u.referralCode}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${(u.balance?.totalBalance || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-semibold text-xs text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={u.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustType('credit');
                            setAdjustModalUser(u);
                          }}
                          title="Add Balance (Credit)"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustType('debit');
                            setAdjustModalUser(u);
                          }}
                          title="Cut Balance (Debit)"
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPassword('');
                          }}
                          title="Change Password"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleBlock(u)}
                          title={u.status === 'active' ? 'Block User Account' : 'Unblock User Account'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Balance Modal */}
      <Modal
        isOpen={adjustModalUser !== null}
        onClose={() => setAdjustModalUser(null)}
        title="Admin Balance Adjustment"
        subtitle={adjustModalUser ? `Account: ${adjustModalUser.name} (@${adjustModalUser.username})` : ''}
      >
        {adjustModalUser && (
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between text-xs">
              <span className="text-slate-400">Current Total Balance:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ${(adjustModalUser.balance?.totalBalance || 0).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('credit')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  adjustType === 'credit'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Credit (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType('debit')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                  adjustType === 'debit'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Debit (-)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Amount ($ USD)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mandatory Audit Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. VIP bonus award, promotional settlement, or dispute refund..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
              >
                {adjusting ? 'Updating Ledger...' : 'Commit Adjustment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={passwordModalUser !== null}
        onClose={() => {
          setPasswordModalUser(null);
          setNewPassword('');
        }}
        title="Change User Password"
        subtitle={passwordModalUser ? `Account: ${passwordModalUser.name} (@${passwordModalUser.username})` : ''}
      >
        {passwordModalUser && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              Set a brand new login password for user <strong className="text-white">{passwordModalUser.name}</strong> (<span className="text-amber-400 font-mono">@{passwordModalUser.username}</span>). The user will be able to log into their account immediately with this new password.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 4 characters)..."
                required
                minLength={4}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                The password is typed in clear text so you can verify it before saving.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordModalUser(null);
                  setNewPassword('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPassword}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {savingPassword ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
