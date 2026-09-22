import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLiveSettings } from '../../context/LiveSettingsContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { WithdrawalRequest, PaymentMethod } from '../../types';
import {
  ArrowUpFromLine,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Shield,
  CreditCard,
  DollarSign,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  Info,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface WithdrawalViewProps {
  setCurrentTab: (tab: string) => void;
}

export const WithdrawalView: React.FC<WithdrawalViewProps> = ({ setCurrentTab }) => {
  const { user, balance, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [usdToPkrRate, setUsdToPkrRate] = useState(280.0);
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Payout multi-step wizard (Step 1: Gateway & Amount Box, Step 2: Beneficiary Details)
  const [payoutStep, setPayoutStep] = useState<1 | 2>(1);

  // Settings & Timings with Real-Time Global Sync
  const { settings: liveSettings } = useLiveSettings();
  const [settings, setSettings] = useState<{
    minWithdrawal?: number;
    maxWithdrawal?: number;
    withdrawalFeePercent?: number;
    withdrawalTimingEnabled?: boolean;
    withdrawalStartTime?: string;
    withdrawalEndTime?: string;
    withdrawalAllowedDays?: string[];
    withdrawalClosedMessage?: string;
    withdrawalBoxes?: number[];
    isWithdrawalOpen?: boolean;
    withdrawalWindowReason?: string;
  }>({});

  const fetchData = async () => {
    try {
      const methodsPromise = apiRequest<{ methods: PaymentMethod[]; usdToPkrRate?: number }>('/api/deposits/methods');
      const withdrawalsPromise = user
        ? apiRequest<{ withdrawals: WithdrawalRequest[] }>('/api/withdrawals/my')
        : Promise.resolve({ withdrawals: [] });
      const settingsPromise = apiRequest<{ settings: any }>('/api/public-settings');

      const [methodsRes, withdrawalsRes, settingsRes] = await Promise.all([
        methodsPromise,
        withdrawalsPromise,
        settingsPromise,
      ]);

      const activeMethods = methodsRes.methods || [];
      setMethods(activeMethods);
      if (methodsRes.usdToPkrRate) {
        setUsdToPkrRate(methodsRes.usdToPkrRate);
      }
      if (activeMethods.length > 0 && !selectedMethod) {
        setSelectedMethod(activeMethods[0]);
      }
      setMyWithdrawals(withdrawalsRes.withdrawals || []);
      if (settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load withdrawal data:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const [showClosedModal, setShowClosedModal] = useState(false);

  // Merge live Firestore settings with fetched settings for instantaneous sub-second sync
  const activeSettings = { ...settings, ...liveSettings };

  // Calculate live timing window
  const checkLiveTiming = () => {
    if (!activeSettings.withdrawalTimingEnabled) return { open: true, message: '' };
    try {
      const offset = typeof activeSettings.withdrawalTimezoneOffset === 'number' ? activeSettings.withdrawalTimezoneOffset : 5;
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const targetTime = new Date(utc + 3600000 * offset);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = days[targetTime.getDay()];
      const allowedDays: string[] = Array.isArray(activeSettings.withdrawalAllowedDays)
        ? activeSettings.withdrawalAllowedDays
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      if (!allowedDays.includes(currentDay)) {
        return {
          open: false,
          message: `Withdrawals are closed on ${currentDay}. Requests are only processed on ${allowedDays.join(', ')}.`,
        };
      }

      const parseMinutes = (timeStr: string) => {
        const [h, m] = (timeStr || '00:00').split(':').map((x: string) => parseInt(x, 10));
        return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      };

      const curMins = targetTime.getHours() * 60 + targetTime.getMinutes();
      const startMins = parseMinutes(activeSettings.withdrawalStartTime || '09:00');
      const endMins = parseMinutes(activeSettings.withdrawalEndTime || '18:00');

      if (startMins <= endMins) {
        if (curMins < startMins || curMins > endMins) {
          return {
            open: false,
            message: activeSettings.withdrawalClosedMessage || `Withdrawals are only open from ${activeSettings.withdrawalStartTime || '09:00'} to ${activeSettings.withdrawalEndTime || '18:00'} PKT.`,
          };
        }
      }
      return { open: true, message: '' };
    } catch {
      return { open: true, message: '' };
    }
  };

  const timingCheck = checkLiveTiming();
  const timingEnabled = !!activeSettings.withdrawalTimingEnabled;
  const isWindowOpen = timingEnabled ? timingCheck.open : true;
  const closedNoticeMessage = timingCheck.message || activeSettings.withdrawalClosedMessage || 'Withdrawals are currently closed.';

  const minWithdrawal = activeSettings.minWithdrawal ?? 2;
  const maxWithdrawal = activeSettings.maxWithdrawal ?? 10000;
  const withdrawalFeePercent = activeSettings.withdrawalFeePercent ?? 0;

  const numAmount = parseFloat(amount) || 0;
  const feeAmount = 0; // No fee
  const netPayout = numAmount;
  const availableBal = balance?.availableWithdrawal || 0;

  const withdrawalBoxes: number[] = Array.isArray(activeSettings.withdrawalBoxes) && activeSettings.withdrawalBoxes.length > 0
    ? activeSettings.withdrawalBoxes
    : [2, 4, 8, 10, 20, 30, 40, 50, 70, 100];

  const handleProceedToStep2 = () => {
    if (timingEnabled && !isWindowOpen) {
      setShowClosedModal(true);
      return;
    }

    if (!selectedMethod) {
      error('Please select a payout gateway.');
      return;
    }

    if (!amount || numAmount <= 0) {
      error('Please select a withdrawal amount box.');
      return;
    }

    if (numAmount < minWithdrawal) {
      error(`Minimum withdrawal amount is $${minWithdrawal}.`);
      return;
    }

    if (numAmount > maxWithdrawal) {
      error(`Maximum withdrawal per transaction is $${maxWithdrawal}.`);
      return;
    }

    if (numAmount > availableBal) {
      error(`Insufficient available balance. You only have $${availableBal.toFixed(2)} available.`);
      return;
    }

    setPayoutStep(2);
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (timingEnabled && !isWindowOpen) {
      setShowClosedModal(true);
      return;
    }

    if (!selectedMethod) return;

    if (!amount || numAmount <= 0) {
      error('Please select a valid withdrawal amount box.');
      return;
    }

    if (numAmount < minWithdrawal) {
      error(`Minimum withdrawal amount is $${minWithdrawal}.`);
      return;
    }

    if (numAmount > maxWithdrawal) {
      error(`Maximum withdrawal per transaction is $${maxWithdrawal}.`);
      return;
    }

    if (numAmount > availableBal) {
      error(`Insufficient available balance. You only have $${availableBal.toFixed(2)} available.`);
      return;
    }

    if (!accountTitle.trim() || !accountNumber.trim()) {
      error('Please fill in both Beneficiary Account Title and Account Number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ message?: string }>('/api/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          methodName: selectedMethod.name,
          amount: numAmount,
          accountTitle: accountTitle.trim(),
          accountNumber: accountNumber.trim(),
        }),
      });

      success(res.message || 'Withdrawal request submitted! Scroll below to see your transaction record.');
      setAmount('');
      setAccountTitle('');
      setAccountNumber('');
      setPayoutStep(1);
      await refreshProfile();
      await fetchData();
    } catch (err: any) {
      error(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter withdrawals
  const filteredWithdrawals = myWithdrawals.filter((w) => {
    const matchesFilter =
      statusFilter === 'all' ? true : w.status.toLowerCase() === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      w.methodName.toLowerCase().includes(q) ||
      w.id.toLowerCase().includes(q) ||
      (w.accountTitle && w.accountTitle.toLowerCase().includes(q)) ||
      (w.accountNumber && w.accountNumber.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const totalWithdrawnAmount = myWithdrawals
    .filter((w) => w.status === 'approved' || w.status === 'completed')
    .reduce((sum, w) => sum + w.netAmount, 0);

  const pendingWithdrawalsCount = myWithdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ArrowUpFromLine className="w-6 h-6 text-amber-400" />
            Capital Withdrawal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Withdraw your daily investment profits and referral commissions directly to JazzCash, Easypaisa, Bank, or USDT.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Automated & Guarded Ledger</span>
        </div>
      </div>

      {/* Admin Working Hours Timing Banner */}
      {timingEnabled && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isWindowOpen
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isWindowOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>
                  {isWindowOpen ? '🟢 Payout Window is Currently OPEN' : '🔴 Payout Window is Currently CLOSED'}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
                  {settings.withdrawalStartTime || '09:00'} - {settings.withdrawalEndTime || '18:00'} PKT
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isWindowOpen
                  ? `Submissions are active today (${(settings.withdrawalAllowedDays || []).join(', ')}). Requests submitted will be audited promptly.`
                  : settings.withdrawalClosedMessage ||
                    `Withdrawals are only accepted during official bank working hours (${settings.withdrawalStartTime || '09:00'} to ${settings.withdrawalEndTime || '18:00'} PKT). Please submit during open hours.`}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono shrink-0 text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
            Allowed Days: {(settings.withdrawalAllowedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).join(', ')}
          </div>
        </div>
      )}

      {/* Request Payout Form */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Balance card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0f172a] to-[#121c33] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Available for Withdrawal
                </span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                  ${availableBal.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Total Account Balance:</span>
                <div className="font-mono text-sm font-bold text-white">
                  ${(balance?.totalBalance || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Form container */}
            <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6 space-y-5">
              {payoutStep === 1 ? (
                /* ================= STEP 1: SELECT GATEWAY & AMOUNT BOX ================= */
                <div className="space-y-5">
                  {/* Method selection tabs */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Select Destination Gateway
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {methods.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMethod(m)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            selectedMethod?.id === m.id
                              ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Bar matching screenshot */}
                  <div className="flex items-center justify-between px-1 pt-1">
                    <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                      ROUTING GATEWAY LIMITS
                    </span>
                    <Shield className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                  </div>

                  {/* Display Card matching screenshot */}
                  <div className="bg-[#0a0d16] border border-slate-800/90 rounded-3xl p-6 text-center shadow-inner relative overflow-hidden">
                    <span className="text-xs font-bold text-rose-500 tracking-widest uppercase block">
                      ENTER PAYOUT AMOUNT (COINS / USDT)
                    </span>
                    <div className="text-5xl sm:text-6xl font-black text-slate-300 tracking-tight font-mono my-3">
                      {amount ? `${amount} USDT` : '0'}
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Tap any box below to select fixed payout amount
                    </span>
                  </div>

                  {/* Fixed Preset Amount Boxes Grid (strictly non-text, member taps to select) */}
                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      {withdrawalBoxes.map((boxVal) => {
                        const isSelected = amount === boxVal.toString();
                        const isAffordable = boxVal <= availableBal;
                        return (
                          <button
                            key={boxVal}
                            type="button"
                            onClick={() => setAmount(boxVal.toString())}
                            className={`py-3.5 px-2 rounded-2xl border text-center font-bold text-sm sm:text-base font-mono transition-all cursor-pointer ${
                              isSelected
                                ? 'border-rose-500 bg-rose-500/20 text-white ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/60 scale-[1.02]'
                                : 'bg-[#121624] border-slate-800 text-slate-200 hover:bg-[#181f33] hover:border-slate-700'
                            }`}
                          >
                            <span>{boxVal} USDT</span>
                          </button>
                        );
                      })}
                    </div>

                    {amount && numAmount > availableBal && (
                      <p className="text-xs text-rose-400 mt-2 text-center font-medium">
                        ⚠️ Selected amount (${numAmount}) exceeds your available balance (${availableBal.toFixed(2)}).
                      </p>
                    )}
                  </div>

                  {/* NEXT STEP Button matching screenshot */}
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    disabled={(timingEnabled && !isWindowOpen) || !amount || numAmount <= 0 || numAmount > availableBal}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-rose-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>NEXT STEP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* ================= STEP 2: BENEFICIARY ACCOUNT DETAILS ================= */
                <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPayoutStep(1)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h3 className="text-sm font-bold text-white">Beneficiary Account Details</h3>
                        <p className="text-[11px] text-slate-400">Step 2 of 2: Enter payout destination details</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {amount} USDT
                    </span>
                  </div>

                  {/* Summary card */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Gateway Channel:</span>
                      <span className="font-bold text-white">{selectedMethod?.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Selected Payout Box:</span>
                      <span className="font-mono text-white">${numAmount.toFixed(2)} USD ({amount} USDT)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Processing Fee:</span>
                      <span className="font-mono text-emerald-400 font-bold">$0.00 (0% - Free)</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
                      <span>Net Payout You Will Receive:</span>
                      <span className="font-mono text-emerald-400 text-sm">
                        ${netPayout.toFixed(2)} USD ({amount} USDT)
                      </span>
                    </div>
                    {selectedMethod && !selectedMethod.name.includes('USDT') && !selectedMethod.name.includes('Crypto') && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80 text-amber-300 font-medium">
                        <span>Approx. Local PKR Payout:</span>
                        <span className="font-mono font-bold">
                          ₨ {(netPayout * usdToPkrRate).toLocaleString('en-PK', { maximumFractionDigits: 0 })} PKR
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Beneficiary Account Title (Name)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter account holder name"
                      value={accountTitle}
                      onChange={(e) => setAccountTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Account Number / Mobile Wallet No / Crypto Address
                    </label>
                    <input
                      type="text"
                      placeholder={
                        selectedMethod?.name.includes('USDT')
                          ? 'e.g. TR7NHcorq939Dh8QQ551918...'
                          : 'e.g. 03001234567 or IBAN'
                      }
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPayoutStep(1)}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      ← Change Box
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (timingEnabled && !isWindowOpen) || numAmount <= 0 || numAmount > availableBal}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : timingEnabled && !isWindowOpen ? (
                        <span>Withdrawal Window Currently Closed</span>
                      ) : (
                        <>
                          <ArrowUpFromLine className="w-4 h-4" />
                          <span>Submit Withdrawal Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
      </div>

      {/* Full Withdrawal History & Audited Ledger Section (Always Visible On Scroll) */}
      <div className="space-y-6 pt-6 border-t border-slate-800">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Payouts Settled
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              ${totalWithdrawnAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Successfully processed to your accounts
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Pending Audits
            </div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
              {pendingWithdrawalsCount} Requests
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Currently in verification queue
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0e1628]/90 border border-slate-800">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Requests Made
            </div>
            <div className="text-2xl font-extrabold text-white font-mono mt-1">
              {myWithdrawals.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Lifetime withdrawal transactions
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
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
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
              placeholder="Search TID, account or method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Full History Records */}
        <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Complete Withdrawal Ledger ({filteredWithdrawals.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Auto-synced with ledger
            </span>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No withdrawal records match your current filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWithdrawals.map((w) => (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{w.methodName}</span>
                      <span className="font-mono text-[10px] text-slate-500">#{w.id.substring(0, 8)}</span>
                    </div>
                    <Badge status={w.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Requested Amount</span>
                      <span className="font-mono font-bold text-white text-sm">${w.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Net Payout Received</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        ${w.netAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500">Beneficiary:</span>{' '}
                      <strong className="text-white">{w.accountTitle}</strong>
                    </div>
                    <div className="font-mono">
                      <span className="text-slate-500">Account / Address:</span>{' '}
                      <span className="text-amber-300/90">{w.accountNumber || w.accountDetails}</span>
                    </div>
                  </div>

                  {w.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                      <strong>Admin Rejection Reason:</strong> {w.rejectionReason} (Funds refunded to wallet)
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>Submitted: {new Date(w.createdAt).toLocaleString()}</span>
                    {w.reviewedAt && (
                      <span>Audited: {new Date(w.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Closed Window Popup Modal */}
      <Modal
        isOpen={showClosedModal}
        onClose={() => setShowClosedModal(false)}
        title="Withdrawal Timing Restriction"
        subtitle="Requests are restricted to official admin working hours"
      >
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
            <Clock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-200 text-sm mb-1">Withdrawals Currently Closed</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                {settings.withdrawalClosedMessage ||
                  `Withdrawals are only accepted between ${settings.withdrawalStartTime || '09:00'} and ${settings.withdrawalEndTime || '18:00'} PKT. Please submit your request during active hours.`}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Admin Allowed Hours:</span>
              <span className="font-bold font-mono text-amber-400">
                {settings.withdrawalStartTime || '09:00'} - {settings.withdrawalEndTime || '18:00'} PKT
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Operational Days:</span>
              <span className="font-semibold text-slate-200">
                {(settings.withdrawalAllowedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).join(', ')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current Status:</span>
              <span className="font-bold text-rose-400">Closed (Outside Timing Window)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowClosedModal(false)}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </Modal>
    </div>
  );
};
