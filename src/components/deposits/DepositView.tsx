import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLiveSettings } from '../../context/LiveSettingsContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { PaymentMethod, DepositRequest } from '../../types';
import {
  ArrowDownToLine,
  Smartphone,
  Wallet,
  Coins,
  Landmark,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

interface DepositViewProps {
  setCurrentTab: (tab: string) => void;
}

export const DepositView: React.FC<DepositViewProps> = ({ setCurrentTab }) => {
  const { user, balance, refreshProfile } = useAuth();
  const { success, error } = useToast();
  const { settings: liveSettings } = useLiveSettings();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [pkrInput, setPkrInput] = useState('');
  const [usdToPkrRate, setUsdToPkrRate] = useState(280);
  const [inputMode, setInputMode] = useState<'USD' | 'PKR'>('USD');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [userDeposits, setUserDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // History Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDepositData = async () => {
    try {
      const methodsPromise = apiRequest<{ methods: PaymentMethod[]; usdToPkrRate?: number }>('/api/deposits/methods');
      const depositsPromise = user
        ? apiRequest<{ deposits: DepositRequest[] }>('/api/deposits/my')
        : Promise.resolve({ deposits: [] });

      const [methodsRes, depositsRes] = await Promise.all([methodsPromise, depositsPromise]);

      const activeMethods = methodsRes.methods || [];
      setMethods(activeMethods);
      if (methodsRes.usdToPkrRate) {
        setUsdToPkrRate(methodsRes.usdToPkrRate);
      }
      setSelectedMethod((prev) => {
        if (!prev) {
          return activeMethods[0] || null;
        }
        // Match existing selected method with fresh version from server
        const matched = activeMethods.find((m) => m.id === prev.id);
        if (matched) {
          return matched; // Fresh updated copy with new accountNumber, accountTitle, etc.!
        }
        // If previous method was deleted or disabled, switch to first active method
        return activeMethods[0] || null;
      });
      setUserDeposits(depositsRes.deposits || []);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load deposit data:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositData();

    // 1. Poll every 5s for background updates
    const interval = setInterval(() => {
      fetchDepositData();
    }, 5000);

    // 2. BroadcastChannel listener for instant real-time sync across windows/tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('assetflow-payment-gateway-sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'PAYMENT_METHODS_CHANGED') {
            fetchDepositData();
          }
        };
      } catch {
        // safe fallback
      }
    }

    // 3. Storage event listener (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'assetflow_payment_methods_sync') {
        fetchDepositData();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Custom window event (same-tab sync)
    const handleCustom = () => {
      fetchDepositData();
    };
    window.addEventListener('assetflow-payment-methods-updated', handleCustom);

    // 5. Window focus event
    const handleFocus = () => {
      fetchDepositData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('assetflow-payment-methods-updated', handleCustom);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const isPkrMethod =
    selectedMethod?.currency === 'PKR' ||
    selectedMethod?.name.toLowerCase().includes('jazz') ||
    selectedMethod?.name.toLowerCase().includes('easy') ||
    selectedMethod?.name.toLowerCase().includes('paisa') ||
    selectedMethod?.name.toLowerCase().includes('bank');

  const effectiveUsdToPkrRate = liveSettings.usdToPkrRate || usdToPkrRate;
  const numAmount = parseFloat(amount) || 0;
  const calculatedPkr = Number((numAmount * effectiveUsdToPkrRate).toFixed(0));
  const fee = selectedMethod ? (numAmount * selectedMethod.feePercent) / 100 : 0;
  const netAmount = Math.max(0, numAmount - fee);

  const handleUsdChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setPkrInput((num * effectiveUsdToPkrRate).toFixed(0));
    } else {
      setPkrInput('');
    }
  };

  const handlePkrChange = (val: string) => {
    setPkrInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmount((num / effectiveUsdToPkrRate).toFixed(2));
    } else {
      setAmount('');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    if (!amount || numAmount <= 0) {
      error('Please enter a valid deposit amount.');
      return;
    }

    if (numAmount < selectedMethod.minDeposit) {
      error(`Minimum deposit for ${selectedMethod.name} is $${selectedMethod.minDeposit}.`);
      return;
    }

    if (numAmount > selectedMethod.maxDeposit) {
      error(`Maximum deposit for ${selectedMethod.name} is $${selectedMethod.maxDeposit}.`);
      return;
    }

    if (!transactionRef.trim()) {
      error('Please enter the Transaction Reference ID (TID / TXID).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ message?: string }>('/api/deposits', {
        method: 'POST',
        body: JSON.stringify({
          methodId: selectedMethod.id,
          amount: numAmount,
          pkrAmount: isPkrMethod ? calculatedPkr : undefined,
          exchangeRate: usdToPkrRate,
          transactionRef: transactionRef.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      success(res.message || 'Deposit request submitted successfully! Scroll below to see your transaction record.');
      setAmount('');
      setPkrInput('');
      setTransactionRef('');
      setNotes('');
      await refreshProfile();
      await fetchDepositData();
    } catch (err: any) {
      error(err.message || 'Deposit submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getMethodIcon = (iconName: string) => {
    switch (iconName) {
      case 'coins':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'landmark':
        return <Landmark className="w-5 h-5 text-sky-400" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-emerald-400" />;
      default:
        return <Smartphone className="w-5 h-5 text-amber-400" />;
    }
  };

  // Filtered deposits
  const filteredDeposits = userDeposits.filter((dep) => {
    const matchesFilter =
      statusFilter === 'all' ? true : dep.status.toLowerCase() === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      dep.methodName.toLowerCase().includes(q) ||
      dep.transactionRef.toLowerCase().includes(q) ||
      dep.id.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const totalApprovedDeposits = userDeposits
    .filter((d) => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const pendingDepositsCount = userDeposits.filter((d) => d.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ArrowDownToLine className="w-6 h-6 text-emerald-400" />
            Deposit Funds
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fund your account securely using Pakistani local wallets (JazzCash, Easypaisa), Bank IBFT, or USDT (TRC-20).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
          <CheckCircle2 className="w-4 h-4" />
          <span>Manual & Automated Verification</span>
        </div>
      </div>

      {/* Deposit Form Section */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Method Selection */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Step 1: Choose Deposit Gateway
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                1 USD = ₨{usdToPkrRate} PKR
              </span>
              <span className="text-[11px] font-mono text-slate-300 font-semibold bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                Min Deposit: $10 • 0% Fee
              </span>
            </div>
          </div>
              {methods.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">Deposit Gateways Being Updated</p>
                  <p className="text-xs text-slate-400">
                    Official receiving accounts are currently being updated by administration. Please check back in a few moments.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  {methods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-800 shrink-0">
                          {getMethodIcon(method.icon)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white leading-tight">
                            {method.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {method.networkOrBranch || 'Direct Account'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Details & Payment Instructions */}
            {selectedMethod && (
              <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step 2: Transfer to Official Platform Account
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Verified
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    1 USD = {usdToPkrRate} PKR
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  {selectedMethod.accountTitle && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Account Title:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {selectedMethod.accountTitle}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.accountTitle!, 'title')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedMethod.accountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Account / Mobile Number:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          {selectedMethod.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.accountNumber!, 'number')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedMethod.networkOrBranch && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Network / Branch:</span>
                      <span className="text-xs font-bold text-amber-400 uppercase font-mono">
                        {selectedMethod.networkOrBranch}
                      </span>
                    </div>
                  )}
                </div>

                {selectedMethod.instructions && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{selectedMethod.instructions}</span>
                  </div>
                )}

                {/* Deposit Submission Form */}
                <form onSubmit={handleSubmitDeposit} className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Step 3: Enter Deposit Amount & TID
                    </label>
                    {isPkrMethod && (
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => setInputMode('USD')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            inputMode === 'USD'
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          USD ($)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('PKR')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            inputMode === 'PKR'
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          PKR (₨)
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Amount in USD ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="any"
                          placeholder={`Min $${selectedMethod.minDeposit}`}
                          value={amount}
                          onChange={(e) => handleUsdChange(e.target.value)}
                          required
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
                        />
                      </div>
                    </div>

                    {isPkrMethod ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Calculated PKR Amount (₨)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₨</span>
                          <input
                            type="number"
                            placeholder="e.g. 5600"
                            value={pkrInput}
                            onChange={(e) => handlePkrChange(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Estimated Network Fee
                        </label>
                        <div className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 font-mono text-sm">
                          ${fee.toFixed(2)} ({selectedMethod.feePercent}%)
                        </div>
                      </div>
                    )}
                  </div>

                  {numAmount > 0 && selectedMethod.feePercent > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Gateway Fee ({selectedMethod.feePercent}%):</span>
                      <span className="text-slate-300">${fee.toFixed(2)}</span>
                      <span className="text-slate-400">Net Credit in Wallet:</span>
                      <span className="text-emerald-400 font-bold">${netAmount.toFixed(2)} USD</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Transaction / Reference ID (TID / TXID)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter the 10-12 digit TID from JazzCash/Easypaisa SMS or Crypto TXID"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Additional Notes <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Sender name or phone number"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowDownToLine className="w-4 h-4" />
                        <span>Submit Deposit Request</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
      </div>

      {/* Full Deposit History & Audited Ledger Section (Always Visible On Scroll) */}
      <div className="space-y-6 pt-6 border-t border-slate-800">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Approved Deposits
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              ${totalApprovedDeposits.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Successfully credited to wallet
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              In Review
            </div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
              {pendingDepositsCount} Pending
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Admin verification in progress
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Deposit Attempts
            </div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {userDeposits.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Lifetime deposit requests
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1628]/90 border border-slate-800 p-4 rounded-2xl">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                  statusFilter === filterKey
                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by TID or gateway..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* Full History Records */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Complete Deposit History ({filteredDeposits.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Auto-refreshed upon submission
            </span>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No deposit transactions found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{dep.methodName}</span>
                      <span className="font-mono text-[10px] text-slate-500">#{dep.id.substring(0, 8)}</span>
                    </div>
                    <Badge status={dep.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 block">USD Amount</span>
                      <span className="font-mono font-bold text-white text-sm">${dep.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">PKR Equivalent</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {dep.pkrAmount ? `₨ ${dep.pkrAmount.toLocaleString()}` : `$${dep.amount.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500">Transaction ID (TID):</span>{' '}
                      <strong className="font-mono text-amber-300/90">{dep.transactionRef}</strong>
                    </div>
                    {dep.notes && (
                      <div>
                        <span className="text-slate-500">Notes:</span> <span>{dep.notes}</span>
                      </div>
                    )}
                    {dep.adminNotes && (
                      <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] mt-1">
                        <strong>Admin Feedback:</strong> {dep.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>Submitted: {new Date(dep.createdAt).toLocaleString()}</span>
                    {dep.reviewedAt && (
                      <span>Processed: {new Date(dep.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
