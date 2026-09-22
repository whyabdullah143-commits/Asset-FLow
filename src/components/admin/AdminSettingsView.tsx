import React, { useState, useEffect } from 'react';
import { useLiveSettings, DEFAULT_PLATFORM_SETTINGS } from '../../context/LiveSettingsContext';
import { useToast } from '../../context/ToastContext';
import { SystemSettings } from '../../types';
import {
  Settings,
  Save,
  ShieldAlert,
  DollarSign,
  Percent,
  Megaphone,
  Globe,
  Headphones,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Zap,
  Radio,
  Check,
} from 'lucide-react';

export const AdminSettingsView: React.FC = () => {
  const { success, error } = useToast();
  const { settings, isLiveConnected, lastSyncedAt, updateSettings, resetToDefaultSettings } = useLiveSettings();
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form states
  const [siteName, setSiteName] = useState(settings.siteName || 'AssetFlow');
  const [tagline, setTagline] = useState(settings.tagline || 'Next-Gen Automated Yield & Staking Platform');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '$');
  const [usdToPkrRate, setUsdToPkrRate] = useState((settings.usdToPkrRate || 280).toString());
  const [minDeposit, setMinDeposit] = useState((settings.minDeposit ?? 10).toString());
  const [maxDeposit, setMaxDeposit] = useState((settings.maxDeposit ?? 5000).toString());
  const [minWithdrawal, setMinWithdrawal] = useState((settings.minWithdrawal ?? 2).toString());
  const [maxWithdrawal, setMaxWithdrawal] = useState((settings.maxWithdrawal ?? 10000).toString());
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState((settings.withdrawalFeePercent ?? 0.0).toString());
  const [referralBonusPercent, setReferralBonusPercent] = useState((settings.referralCommissionPercent ?? 6.0).toString());
  const [announcementText, setAnnouncementText] = useState(settings.announcementText || '');
  const [showAnnouncement, setShowAnnouncement] = useState(settings.showAnnouncement !== false);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail || 'support@assetflow.com');
  const [supportPhone, setSupportPhone] = useState(settings.supportPhone || '+92 300 1234567');
  const [supportWhatsApp, setSupportWhatsApp] = useState(settings.supportWhatsApp || 'https://wa.me/923001234567');
  const [supportTelegram, setSupportTelegram] = useState(settings.supportTelegram || 'https://t.me/assetflow_official');
  const [maintenanceMode, setMaintenanceMode] = useState(!!settings.maintenanceMode);

  // Withdrawal Box Presets (Denominations)
  const [withdrawalBoxes, setWithdrawalBoxes] = useState<number[]>(() => {
    return Array.isArray(settings.withdrawalBoxes) && settings.withdrawalBoxes.length > 0
      ? settings.withdrawalBoxes
      : [2, 4, 8, 10, 20, 30, 40, 50, 70, 100];
  });
  const [newBoxInput, setNewBoxInput] = useState('');

  // Withdrawal Timing Restriction states
  const [withdrawalTimingEnabled, setWithdrawalTimingEnabled] = useState(settings.withdrawalTimingEnabled !== false);
  const [withdrawalStartTime, setWithdrawalStartTime] = useState(settings.withdrawalStartTime || '09:00');
  const [withdrawalEndTime, setWithdrawalEndTime] = useState(settings.withdrawalEndTime || '18:00');
  const [withdrawalAllowedDays, setWithdrawalAllowedDays] = useState<string[]>(
    settings.withdrawalAllowedDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  );
  const [withdrawalTimezoneOffset, setWithdrawalTimezoneOffset] = useState((settings.withdrawalTimezoneOffset ?? 5).toString());
  const [withdrawalClosedMessage, setWithdrawalClosedMessage] = useState(
    settings.withdrawalClosedMessage || 'Withdrawals are currently closed. Requests are only accepted from 09:00 AM to 06:00 PM (Monday to Saturday) PKT.'
  );

  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Sync state if settings change from external / cloud updates
  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || 'AssetFlow');
      setTagline(settings.tagline || 'Next-Gen Automated Yield & Staking Platform');
      setCurrencySymbol(settings.currencySymbol || '$');
      setUsdToPkrRate((settings.usdToPkrRate || 280).toString());
      setMinDeposit((settings.minDeposit ?? 10).toString());
      setMaxDeposit((settings.maxDeposit ?? 5000).toString());
      setMinWithdrawal((settings.minWithdrawal ?? 2).toString());
      setMaxWithdrawal((settings.maxWithdrawal ?? 10000).toString());
      setWithdrawalFeePercent((settings.withdrawalFeePercent ?? 0.0).toString());
      setReferralBonusPercent((settings.referralCommissionPercent ?? 6.0).toString());
      if (Array.isArray(settings.withdrawalBoxes) && settings.withdrawalBoxes.length > 0) {
        setWithdrawalBoxes(settings.withdrawalBoxes);
      }
      setAnnouncementText(settings.announcementText || '');
      setShowAnnouncement(settings.showAnnouncement !== false);
      setSupportEmail(settings.supportEmail || '');
      setSupportPhone(settings.supportPhone || '');
      setSupportWhatsApp(settings.supportWhatsApp || '');
      setSupportTelegram(settings.supportTelegram || '');
      setMaintenanceMode(!!settings.maintenanceMode);
      setWithdrawalTimingEnabled(settings.withdrawalTimingEnabled !== false);
      setWithdrawalStartTime(settings.withdrawalStartTime || '09:00');
      setWithdrawalEndTime(settings.withdrawalEndTime || '18:00');
      if (Array.isArray(settings.withdrawalAllowedDays)) {
        setWithdrawalAllowedDays(settings.withdrawalAllowedDays);
      }
      setWithdrawalTimezoneOffset((settings.withdrawalTimezoneOffset ?? 5).toString());
      setWithdrawalClosedMessage(settings.withdrawalClosedMessage || '');
    }
  }, [settings]);

  const toggleDay = (day: string) => {
    if (withdrawalAllowedDays.includes(day)) {
      if (withdrawalAllowedDays.length === 1) {
        error('At least one day must be selected.');
        return;
      }
      setWithdrawalAllowedDays(withdrawalAllowedDays.filter((d) => d !== day));
    } else {
      setWithdrawalAllowedDays([...withdrawalAllowedDays, day]);
    }
  };

  // Add individual withdrawal box
  const handleAddBox = () => {
    const val = parseFloat(newBoxInput.trim());
    if (isNaN(val) || val <= 0) {
      error('Enter a valid positive number for payout box.');
      return;
    }
    if (withdrawalBoxes.includes(val)) {
      error(`Box amount ${val} already exists.`);
      return;
    }
    const updated = [...withdrawalBoxes, val].sort((a, b) => a - b);
    setWithdrawalBoxes(updated);
    setNewBoxInput('');
  };

  // Remove individual withdrawal box
  const handleRemoveBox = (boxToRemove: number) => {
    if (withdrawalBoxes.length <= 1) {
      error('At least one withdrawal box must remain.');
      return;
    }
    const updated = withdrawalBoxes.filter((b) => b !== boxToRemove);
    setWithdrawalBoxes(updated);
  };

  // Save all settings to Real-Time Cloud Firestore & Server
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minDep = parseFloat(minDeposit);
    const maxDep = parseFloat(maxDeposit);
    const minWith = parseFloat(minWithdrawal);
    const maxWith = parseFloat(maxWithdrawal);
    const fee = parseFloat(withdrawalFeePercent);
    const ref = parseFloat(referralBonusPercent);
    const pkr = parseFloat(usdToPkrRate);

    if (isNaN(minDep) || isNaN(maxDep) || isNaN(minWith) || isNaN(maxWith) || isNaN(fee) || isNaN(ref) || isNaN(pkr)) {
      error('Please check all numeric values');
      return;
    }

    if (withdrawalBoxes.length === 0) {
      error('Please specify at least one valid withdrawal box amount.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<SystemSettings> = {
        siteName: siteName.trim() || 'AssetFlow',
        tagline: tagline.trim(),
        currencySymbol: currencySymbol.trim() || '$',
        usdToPkrRate: pkr,
        minDeposit: minDep,
        maxDeposit: maxDep,
        minWithdrawal: minWith,
        maxWithdrawal: maxWith,
        withdrawalFeePercent: fee,
        withdrawalBoxes,
        referralCommissionPercent: ref,
        referralBonusPercent: ref,
        announcementText: announcementText.trim(),
        showAnnouncement,
        supportEmail: supportEmail.trim(),
        supportPhone: supportPhone.trim(),
        supportWhatsApp: supportWhatsApp.trim(),
        supportTelegram: supportTelegram.trim(),
        maintenanceMode,
        withdrawalTimingEnabled,
        withdrawalStartTime: withdrawalStartTime.trim() || '09:00',
        withdrawalEndTime: withdrawalEndTime.trim() || '18:00',
        withdrawalAllowedDays,
        withdrawalTimezoneOffset: parseFloat(withdrawalTimezoneOffset) || 5,
        withdrawalTimezoneName: `PKT (UTC+${withdrawalTimezoneOffset || 5})`,
        withdrawalClosedMessage: withdrawalClosedMessage.trim(),
      };

      await updateSettings(payload);
      success('Platform settings broadcast live! All user devices updated within 1 second.');
    } catch (err: any) {
      error(err.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      await resetToDefaultSettings();
      setShowResetConfirm(false);
      success('All settings reset to default and broadcast live across all devices!');
    } catch (err: any) {
      error(err.message || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header with Real-Time Global Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5 font-['Syne']">
            <Settings className="w-6 h-6 text-rose-400" />
            Master Platform Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global real-time database settings. Any edit, deletion, or addition updates user screens worldwide within 1 second.
          </p>
        </div>

        {/* Live sync badge */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>⚡ Global Real-Time Sync Active (&lt;1s)</span>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:text-rose-400 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-bold text-lg text-white">Reset All Settings?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will reset site identity, payment thresholds, announcement messages, and schedule timings back to factory defaults. All connected user devices will be updated immediately.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg shadow-rose-600/30"
              >
                {saving ? 'Resetting...' : 'Yes, Reset Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Platform Branding & Identity */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                Platform Identity & Brand
              </h3>
              <span className="text-[11px] text-slate-500">Live everywhere</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Platform / Website Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                  placeholder="e.g. AssetFlow"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Displayed in header logo, title tags, and user dashboards
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tagline / Slogan
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Next-Gen Automated Yield & Staking Platform"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Subtitle shown across investor dashboard headers
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Currency Symbol
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  required
                  placeholder="$"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1 USD = PKR Exchange Rate
                </label>
                <input
                  type="number"
                  step="any"
                  value={usdToPkrRate}
                  onChange={(e) => setUsdToPkrRate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Converts deposits and withdrawals in Pakistani Rupee (PKR)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Global Announcement & Notice Banner */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Investor Broadcast & Announcement Banner
              </h3>
              {announcementText && (
                <button
                  type="button"
                  onClick={() => setAnnouncementText('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Text</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-sm font-bold text-white block">
                    Enable Announcement Banner
                  </span>
                  <span className="text-xs text-slate-400">
                    Display high-visibility announcement banner at the top of all investor pages
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAnnouncement}
                    onChange={(e) => setShowAnnouncement(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Announcement Message
                </label>
                <textarea
                  rows={2}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Enter broadcast announcement message (e.g. Special Weekend Earning Multiplier is active!)..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial Limits & Processing Fees */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Capital Inflow & Outflow Thresholds
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Minimum Deposit ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={minDeposit}
                  onChange={(e) => setMinDeposit(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Smallest allowable single transaction deposit
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Maximum Deposit ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={maxDeposit}
                  onChange={(e) => setMaxDeposit(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Largest allowable single transaction deposit
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Minimum Withdrawal ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={minWithdrawal}
                  onChange={(e) => setMinWithdrawal(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Minimum threshold to request a payout
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Maximum Withdrawal per Request ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={maxWithdrawal}
                  onChange={(e) => setMaxWithdrawal(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Withdrawal Fee (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={withdrawalFeePercent}
                  onChange={(e) => setWithdrawalFeePercent(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Deducted from gross payout request
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Direct Referral Commission (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={referralBonusPercent}
                  onChange={(e) => setReferralBonusPercent(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-rose-500/60"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Instant referral bonus credited to upline sponsor
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Withdrawal Amount Preset Boxes (Edit, Add, Remove, Reset) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Withdrawal Amount Preset Boxes (Button Denominations)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Members tap these fixed buttons to request payouts. Add or remove any amounts below.
                </p>
              </div>
              <span className="text-[11px] text-emerald-400/90 font-mono font-bold">
                ● Live on Payout Page
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              {/* Quick Presets Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">Quick Box Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWithdrawalBoxes([2, 4, 8, 10, 20, 30, 40, 50, 70, 100])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                  >
                    Default (2, 4, 8, 10...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawalBoxes([5, 10, 20, 50, 100, 200, 500])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                  >
                    Standard (5, 10, 20...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawalBoxes([1, 2, 5, 10, 15, 20, 50])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
                  >
                    Micro (1, 2, 5...)
                  </button>
                </div>
              </div>

              {/* Interactive Removable Boxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Active Withdrawal Buttons (Click ✕ to delete any box):
                </label>
                <div className="flex flex-wrap gap-2">
                  {withdrawalBoxes.map((amt) => (
                    <div
                      key={amt}
                      className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm font-bold shadow-sm"
                    >
                      <span>{amt} USDT</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBox(amt)}
                        className="w-4 h-4 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title={`Remove ${amt} USDT`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Box Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    step="any"
                    value={newBoxInput}
                    onChange={(e) => setNewBoxInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddBox();
                      }
                    }}
                    placeholder="Enter amount (e.g. 15, 25, 150)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddBox}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Box</span>
                </button>
              </div>

              {/* Live Member Preview */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
                  Live Member Preview (How buttons appear on user withdrawal screen):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {withdrawalBoxes.map((amt) => (
                    <div
                      key={amt}
                      className="py-2.5 px-2 rounded-xl bg-[#121624] border border-slate-800 text-center font-mono font-bold text-xs text-slate-200 shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>{amt}</span>
                      <span className="text-[10px] text-slate-500 font-normal">USDT</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Withdrawal Working Hours & Schedule Control */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Withdrawal Working Hours & Schedule Control
              </h3>
              <span className="text-[11px] text-amber-400/90 font-mono">
                {withdrawalTimingEnabled ? '● Timing Restriction Active' : '○ 24/7 Open'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Toggle Timing restriction */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <span>Enable Withdrawal Hours Restriction</span>
                    {withdrawalTimingEnabled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 max-w-xl">
                    When enabled, users can ONLY submit withdrawal requests during your configured daily time window and selected operating days. Requests outside these hours will be automatically rejected.
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={withdrawalTimingEnabled}
                    onChange={(e) => setWithdrawalTimingEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {withdrawalTimingEnabled && (
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                  {/* Time Window Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Daily Opening Time (24-Hour / PKT)</span>
                      </label>
                      <input
                        type="time"
                        value={withdrawalStartTime}
                        onChange={(e) => setWithdrawalStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        e.g. 09:00 for 9:00 AM
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Daily Closing Time (24-Hour / PKT)</span>
                      </label>
                      <input
                        type="time"
                        value={withdrawalEndTime}
                        onChange={(e) => setWithdrawalEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        e.g. 18:00 for 6:00 PM
                      </span>
                    </div>
                  </div>

                  {/* Operating Days Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Allowed Operating Days</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map((day) => {
                        const isSelected = withdrawalAllowedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timezone offset and Notice */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Timezone Offset (UTC+)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={withdrawalTimezoneOffset}
                        onChange={(e) => setWithdrawalTimezoneOffset(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500/60"
                      />
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Pakistan Standard Time = 5 (UTC+5)
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Notice Message (Shown to User when Closed)
                        </label>
                        <button
                          type="button"
                          onClick={() => setWithdrawalClosedMessage('Withdrawals are currently closed. Requests are only accepted from 09:00 AM to 06:00 PM (Monday to Saturday) PKT.')}
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          Reset Message
                        </button>
                      </div>
                      <input
                        type="text"
                        value={withdrawalClosedMessage}
                        onChange={(e) => setWithdrawalClosedMessage(e.target.value)}
                        placeholder="Withdrawals are currently closed..."
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500/60"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Support & Official Community Channels */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Headphones className="w-4 h-4 text-cyan-400" />
              Customer Support & Official Contact Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Support Email Address
                  </label>
                  {supportEmail && (
                    <button
                      type="button"
                      onClick={() => setSupportEmail('')}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Support Phone / Helpline
                  </label>
                  {supportPhone && (
                    <button
                      type="button"
                      onClick={() => setSupportPhone('')}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    WhatsApp Support URL or Number
                  </label>
                  {supportWhatsApp && (
                    <button
                      type="button"
                      onClick={() => setSupportWhatsApp('')}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={supportWhatsApp}
                  onChange={(e) => setSupportWhatsApp(e.target.value)}
                  placeholder="https://wa.me/923001234567"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Telegram Channel / Group Link
                  </label>
                  {supportTelegram && (
                    <button
                      type="button"
                      onClick={() => setSupportTelegram('')}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Send className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={supportTelegram}
                    onChange={(e) => setSupportTelegram(e.target.value)}
                    placeholder="https://t.me/assetflow_official"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500/60 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Maintenance Mode Control */}
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              System Maintenance Control
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <span>Maintenance Mode Protocol</span>
                  {maintenanceMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  When active, investors instantly see a maintenance screen. Admins still have full backoffice access.
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Changes update on all user and admin devices within 1 second
            </span>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Broadcasting Changes...' : 'Save & Broadcast Live'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
