import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiRequest } from '../../lib/api';
import { Modal } from '../common/Modal';
import { InvestmentPlan } from '../../types';
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface PlansViewProps {
  setCurrentTab: (tab: string) => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ setCurrentTab }) => {
  const { balance, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [activating, setActivating] = useState(false);

  const fetchPlans = async () => {
    try {
      const data = await apiRequest<{ plans: InvestmentPlan[] }>('/api/plans');
      setPlans(data.plans || []);
    } catch (err: any) {
      error('Failed to load investment plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleConfirmActivation = async () => {
    if (!selectedPlan) return;

    if ((balance?.totalBalance || 0) < selectedPlan.price) {
      error(`Insufficient funds. You need $${selectedPlan.price.toFixed(2)} to activate this plan.`);
      setSelectedPlan(null);
      setCurrentTab('deposit');
      return;
    }

    setActivating(true);
    try {
      const res = await apiRequest('/api/plans/activate', {
        method: 'POST',
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      success(res.message || `${selectedPlan.name} activated successfully!`);
      setSelectedPlan(null);
      await refreshProfile();
      setCurrentTab('my-plans');
    } catch (err: any) {
      error(err.message || 'Failed to activate plan');
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            Institutional Investment Tiers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose an algorithmic capital allocation tier to generate automated daily returns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 mr-1.5">Available Balance:</span>
            <span className="font-mono font-bold text-emerald-400">
              ${(balance?.totalBalance || 0).toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => setCurrentTab('deposit')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Add Funds
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading active investment plans...
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-[#0e1628] rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
          No investment plans are currently published. Please check back shortly.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isAffordable = (balance?.totalBalance || 0) >= plan.price;
            const isPopular = plan.badge.toLowerCase().includes('popular') || plan.badge.toLowerCase().includes('high');

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'bg-gradient-to-b from-[#131d38] via-[#0f172a] to-[#0a101f] border-2 border-amber-500/50 shadow-xl shadow-amber-500/10'
                    : 'bg-[#0e1628]/90 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isPopular
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {plan.badge}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {plan.validityDays} Days
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-3 text-center">{plan.name}</h3>

                  {/* Strictly 4 Metrics: Price, Earning, Validity, Total Profit */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 mb-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Price</span>
                      <span className="text-base font-extrabold text-white font-mono">${plan.price.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-800/80" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Earning</span>
                      <span className="text-xs font-bold text-amber-400 font-mono">${plan.dailyIncome.toFixed(2)} / Day</span>
                    </div>
                    <div className="h-px bg-slate-800/80" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Validity</span>
                      <span className="text-xs font-bold text-slate-200">{plan.validityDays} Days</span>
                    </div>
                    <div className="h-px bg-slate-800/80" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Total Profit</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ${((plan.dailyIncome * plan.validityDays) || ((plan.price * plan.totalReturnPercent) / 100)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isPopular
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
                  }`}
                >
                  <span>Activate Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={selectedPlan !== null}
        onClose={() => setSelectedPlan(null)}
        title="Confirm Plan Activation"
        subtitle={selectedPlan ? `Subscribe to ${selectedPlan.name}` : ''}
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Selected Plan:</span>
                <span className="font-bold text-white">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Investment Amount:</span>
                <span className="font-mono font-bold text-white">${selectedPlan.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Daily ROI:</span>
                <span className="font-bold text-amber-400">
                  {selectedPlan.dailyRoiPercent}% (${selectedPlan.dailyIncome.toFixed(2)}/day)
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Validity Period:</span>
                <span className="font-bold text-white">{selectedPlan.validityDays} Days</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Expected Return:</span>
                <span className="font-bold text-emerald-400">
                  ${((selectedPlan.price * selectedPlan.totalReturnPercent) / 100).toFixed(2)} (
                  {selectedPlan.totalReturnPercent}%)
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-slate-300 font-semibold">
                <span>Your Current Balance:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${(balance?.totalBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {(balance?.totalBalance || 0) < selectedPlan.price ? (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <strong>Insufficient Balance:</strong> You need an additional $
                  {(selectedPlan.price - (balance?.totalBalance || 0)).toFixed(2)} to activate this
                  plan. Please fund your account via JazzCash, Easypaisa, or USDT first.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <strong>Ready to Activate:</strong> ${selectedPlan.price.toFixed(2)} will be debited
                  from your balance and deployed into automated daily earnings.
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              {(balance?.totalBalance || 0) < selectedPlan.price ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    setCurrentTab('deposit');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Deposit Funds
                </button>
              ) : (
                <button
                  type="button"
                  disabled={activating}
                  onClick={handleConfirmActivation}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {activating ? 'Activating...' : 'Confirm Activation'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
