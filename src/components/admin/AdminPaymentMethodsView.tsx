import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { PaymentMethod } from '../../types';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Smartphone,
  Coins,
  Landmark,
  ShieldCheck,
  Info,
  Copy,
  Check,
  Power,
  RefreshCw,
  Hash,
  AlertTriangle,
  Zap,
} from 'lucide-react';

export const AdminPaymentMethodsView: React.FC = () => {
  const { success, error } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states: Full Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'mobile_wallet' | 'bank' | 'crypto'>('mobile_wallet');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [networkOrBranch, setNetworkOrBranch] = useState('');
  const [instructions, setInstructions] = useState('');
  const [icon, setIcon] = useState('smartphone');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quick Number Edit Modal
  const [quickEditMethod, setQuickEditMethod] = useState<PaymentMethod | null>(null);
  const [quickNumber, setQuickNumber] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  // Delete Confirmation Modal
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Broadcast helper to notify user tabs and deposit views instantly
  const broadcastSync = () => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('assetflow-payment-methods-updated'));
        localStorage.setItem('assetflow_payment_methods_sync', String(Date.now()));
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('assetflow-payment-gateway-sync');
          channel.postMessage({ type: 'PAYMENT_METHODS_CHANGED', timestamp: Date.now() });
          channel.close();
        }
      }
    } catch {
      // safe fallback
    }
  };

  const fetchMethods = async () => {
    try {
      const data = await apiRequest<{ methods: PaymentMethod[] }>('/api/admin/payment-methods');
      setMethods(data.methods || []);
    } catch (err) {
      console.error('Failed to load methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const openAddModal = () => {
    setEditingMethod(null);
    setName('');
    setType('mobile_wallet');
    setAccountTitle('');
    setAccountNumber('');
    setNetworkOrBranch('');
    setInstructions('Send funds to this account and paste your 12-digit TID / Transaction ID below.');
    setIcon('smartphone');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (m: PaymentMethod) => {
    setEditingMethod(m);
    setName(m.name);
    setType(m.type || 'mobile_wallet');
    setAccountTitle(m.accountTitle);
    setAccountNumber(m.accountNumber);
    setNetworkOrBranch(m.networkOrBranch || '');
    setInstructions(m.instructions);
    setIcon(m.icon || (m.type === 'crypto' ? 'coins' : m.type === 'bank' ? 'landmark' : 'smartphone'));
    setIsActive(m.isActive !== false && m.status !== 'inactive');
    setIsModalOpen(true);
  };

  const openQuickNumberModal = (m: PaymentMethod) => {
    setQuickEditMethod(m);
    setQuickNumber(m.accountNumber);
    setQuickTitle(m.accountTitle);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !accountTitle.trim() || !accountNumber.trim()) {
      error('Please enter Gateway Name, Account Title, and Account Number.');
      return;
    }

    setSaving(true);
    try {
      const minDeposit = editingMethod?.minDeposit ?? 10;
      const maxDeposit = editingMethod?.maxDeposit ?? 5000;
      const feePercent = editingMethod?.feePercent ?? 0;

      const payload = {
        name: name.trim(),
        type,
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        networkOrBranch: networkOrBranch.trim() || undefined,
        instructions: instructions.trim(),
        minDeposit,
        maxDeposit,
        feePercent,
        icon,
        isActive,
      };

      if (editingMethod) {
        await apiRequest(`/api/admin/payment-methods/${editingMethod.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        success(`Gateway "${name}" updated! Changes are live on the user deposit page.`);
      } else {
        await apiRequest('/api/admin/payment-methods', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        success(`New gateway "${name}" added! It is immediately available for member deposits.`);
      }

      setIsModalOpen(false);
      await fetchMethods();
      broadcastSync();
    } catch (err: any) {
      error(err.message || 'Failed to save gateway');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickNumberSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditMethod) return;

    if (!quickNumber.trim()) {
      error('Account Number cannot be empty.');
      return;
    }

    setQuickSaving(true);
    try {
      const res = await apiRequest<{ message: string; method: PaymentMethod }>(
        `/api/admin/payment-methods/${quickEditMethod.id}/quick-number`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            accountNumber: quickNumber.trim(),
            accountTitle: quickTitle.trim() || quickEditMethod.accountTitle,
          }),
        }
      );

      success(res.message || 'Deposit number updated live!');
      setQuickEditMethod(null);
      await fetchMethods();
      broadcastSync();
    } catch (err: any) {
      error(err.message || 'Failed to update account number');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleToggleActive = async (m: PaymentMethod) => {
    try {
      const res = await apiRequest<{ message: string; method: PaymentMethod }>(
        `/api/admin/payment-methods/${m.id}/toggle`,
        {
          method: 'PATCH',
        }
      );
      success(res.message);
      setMethods((prev) => prev.map((item) => (item.id === m.id ? res.method : item)));
      broadcastSync();
    } catch (err: any) {
      error(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!methodToDelete) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/payment-methods/${methodToDelete.id}`, { method: 'DELETE' });
      success(`Payment gateway "${methodToDelete.name}" removed immediately.`);
      setMethodToDelete(null);
      await fetchMethods();
      broadcastSync();
    } catch (err: any) {
      error(err.message || 'Failed to delete payment gateway');
    } finally {
      setDeleting(false);
    }
  };

  const copyNumber = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    success('Account number copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applyPreset = (preset: {
    name: string;
    type: 'mobile_wallet' | 'bank' | 'crypto';
    icon: string;
    title: string;
    numberPlaceholder: string;
    branch: string;
    instructions: string;
  }) => {
    setName(preset.name);
    setType(preset.type);
    setIcon(preset.icon);
    if (!accountTitle) setAccountTitle(preset.title);
    if (!networkOrBranch) setNetworkOrBranch(preset.branch);
    setInstructions(preset.instructions);
  };

  const activeCount = methods.filter((m) => m.isActive !== false && m.status !== 'inactive').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-rose-400" />
              Deposit Gateways & Numbers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Live Instant Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Add, change, or remove JazzCash, EasyPaisa, Bank, and Crypto receiver numbers. All changes reflect instantly on the member deposit page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button
            onClick={() => {
              fetchMethods();
              broadcastSync();
              success('Refreshed & synced with active users.');
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Force re-sync"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deposit Number</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Banner */}
      <div className="p-4 rounded-2xl bg-[#0e1628]/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span>
            <strong className="text-white">Active Gateways:</strong> {activeCount} of {methods.length} live for member deposits. When you change a number here, it updates on the website immediately without page reload.
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Automatic Broadcast Sync Active</span>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
            <span>Loading payment gateways...</span>
          </div>
        ) : methods.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#0e1628]/60 border border-dashed border-slate-800 rounded-2xl p-8">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No Deposit Gateways Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Add your first deposit receiver account (JazzCash, EasyPaisa, Bank, or USDT) so users can fund their accounts.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Account</span>
            </button>
          </div>
        ) : (
          methods.map((m) => {
            const isCurrentlyActive = m.isActive !== false && m.status !== 'inactive';
            return (
              <div
                key={m.id}
                className={`bg-[#0e1628]/95 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 ${
                  isCurrentlyActive
                    ? 'border-slate-800 hover:border-slate-700 shadow-lg'
                    : 'border-rose-950/40 bg-slate-950/40 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar with Icon & Status Toggle */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400">
                        {m.type === 'crypto' || m.icon === 'coins' ? (
                          <Coins className="w-4 h-4 text-amber-400" />
                        ) : m.type === 'bank' || m.icon === 'landmark' ? (
                          <Landmark className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm leading-tight">{m.name}</h3>
                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                          {m.type === 'crypto' ? 'USDT Crypto' : m.type === 'bank' ? 'Bank IBFT' : 'Mobile Wallet'}
                        </span>
                      </div>
                    </div>

                    {/* 1-Click Active Toggle Button */}
                    <button
                      onClick={() => handleToggleActive(m)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isCurrentlyActive
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                      }`}
                      title={isCurrentlyActive ? 'Click to disable' : 'Click to activate'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isCurrentlyActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* Account Details Box */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 mb-3 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                        Account Title (Holder Name)
                      </span>
                      <span className="font-semibold text-white text-xs">{m.accountTitle}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                          Deposit Number / Wallet Address
                        </span>
                        <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm break-all">
                          {m.accountNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyNumber(m.accountNumber, m.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Copy Number"
                        >
                          {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openQuickNumberModal(m)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
                          title="Quick Change Number"
                        >
                          <Hash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {m.networkOrBranch && (
                      <div className="pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                          Network / Branch
                        </span>
                        <span className="text-slate-300 font-medium text-[11px]">{m.networkOrBranch}</span>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
                    {m.instructions}
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openQuickNumberModal(m)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Change Number</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(m)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setMethodToDelete(m)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUICK NUMBER EDIT MODAL */}
      <Modal
        isOpen={Boolean(quickEditMethod)}
        onClose={() => setQuickEditMethod(null)}
        title={`Change Number: ${quickEditMethod?.name}`}
        subtitle="Update the receiving account number instantly for all members."
      >
        <form onSubmit={handleQuickNumberSave} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              This will immediately replace the deposit number shown on the user deposit page in real-time.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Account / Mobile / Wallet Number (New)
            </label>
            <input
              type="text"
              required
              value={quickNumber}
              onChange={(e) => setQuickNumber(e.target.value)}
              placeholder="e.g. 0301 2345678"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Account Title (Name)
            </label>
            <input
              type="text"
              required
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="e.g. AssetFlow Finance"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setQuickEditMethod(null)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={quickSaving}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {quickSaving ? 'Updating...' : 'Update Live Now'}
            </button>
          </div>
        </form>
      </Modal>

      {/* FULL ADD / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMethod ? `Edit ${editingMethod.name}` : 'Add New Deposit Gateway'}
        subtitle="Configure receiving credentials, deposit limits, and instructions."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Quick presets (only shown when adding) */}
          {!editingMethod && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Quick Preset (Click to auto-fill details)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    name: 'JazzCash',
                    type: 'mobile_wallet' as const,
                    icon: 'smartphone',
                    title: 'AssetFlow Official',
                    numberPlaceholder: '0300 1234567',
                    branch: 'JazzCash Pakistan',
                    instructions: 'Send funds to JazzCash account. Enter your 12-digit TID / Reference ID below.',
                  },
                  {
                    name: 'Easypaisa',
                    type: 'mobile_wallet' as const,
                    icon: 'smartphone',
                    title: 'AssetFlow Global',
                    numberPlaceholder: '0345 1234567',
                    branch: 'Telenor Easypaisa',
                    instructions: 'Transfer funds via Easypaisa App. Enter TRX ID from your SMS receipt below.',
                  },
                  {
                    name: 'Meezan Bank',
                    type: 'bank' as const,
                    icon: 'landmark',
                    title: 'AssetFlow SMC-Pvt Ltd',
                    numberPlaceholder: '0101 0102 9948 2201 (IBAN: PK36MEZN...)',
                    branch: 'Meezan Bank Gulberg Branch',
                    instructions: 'Perform IBFT to Meezan Bank. Provide the 10-16 digit bank reference confirmation number.',
                  },
                  {
                    name: 'USDT (TRC-20)',
                    type: 'crypto' as const,
                    icon: 'coins',
                    title: 'AssetFlow Vault',
                    numberPlaceholder: 'TYQ3N9Lq24RkH7KxB9u12wSmJ7xVzP987a',
                    branch: 'TRON TRC-20 Network ONLY',
                    instructions: 'Send exact USDT via TRC-20 network only. Enter the TXID hash below.',
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-white group-hover:text-rose-400 block">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-slate-500">{preset.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Gateway Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. JazzCash or EasyPaisa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as 'mobile_wallet' | 'bank' | 'crypto';
                  setType(val);
                  setIcon(val === 'crypto' ? 'coins' : val === 'bank' ? 'landmark' : 'smartphone');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              >
                <option value="mobile_wallet">Mobile Wallet (JazzCash / EasyPaisa)</option>
                <option value="bank">Bank Transfer (IBFT)</option>
                <option value="crypto">Cryptocurrency (USDT)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Account Title (Name of Receiver)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Ali"
                value={accountTitle}
                onChange={(e) => setAccountTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Deposit Account / Mobile / Wallet No
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 0300 1234567"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Network / Branch (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. JazzCash Pakistan or TRC-20"
                value={networkOrBranch}
                onChange={(e) => setNetworkOrBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="flex items-center pt-2 sm:pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 cursor-pointer"
                />
                <span>Active (Available for member deposits)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Deposit Instructions
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Send payment to this account. After successful transfer, paste your 12-digit TID / Reference ID below."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : editingMethod ? 'Update Live' : 'Add Gateway'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(methodToDelete)}
        onClose={() => setMethodToDelete(null)}
        title="Delete Payment Gateway"
        subtitle="This action will immediately remove this deposit gateway from all members."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white mb-1">
                Are you sure you want to delete &quot;{methodToDelete?.name}&quot;?
              </p>
              <p className="text-slate-300">
                Account Number: <span className="font-mono text-amber-400">{methodToDelete?.accountNumber}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Members will no longer be able to select this payment method for new deposits.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMethodToDelete(null)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
