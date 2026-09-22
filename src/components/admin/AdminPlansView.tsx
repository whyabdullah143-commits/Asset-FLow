import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { InvestmentPlan } from '../../types';
import { Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const AdminPlansView: React.FC = () => {
  const { success, error } = useToast();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [dailyRoiPercent, setDailyRoiPercent] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [badge, setBadge] = useState('Standard');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const data = await apiRequest<{ plans: InvestmentPlan[] }>('/api/admin/plans');
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAddModal = () => {
    setEditingPlan(null);
    setName('');
    setPrice('100');
    setDailyRoiPercent('3.5');
    setValidityDays('30');
    setBadge('Recommended');
    setDescription('High yield algorithmic tier.');
    setFeaturesText('Instant daily ROI claim\nPrincipal locked for duration\n24/7 dedicated support');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: InvestmentPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setPrice(p.price.toString());
    setDailyRoiPercent(p.dailyRoiPercent.toString());
    setValidityDays(p.validityDays.toString());
    setBadge(p.badge || 'Standard');
    setDescription(p.description || '');
    setFeaturesText(p.features.join('\n'));
    setIsActive(p.isActive ?? (p.status === 'active'));
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    const numRoi = parseFloat(dailyRoiPercent);
    const numDays = parseInt(validityDays);

    if (!name || isNaN(numPrice) || isNaN(numRoi) || isNaN(numDays)) {
      error('Please check all numeric inputs.');
      return;
    }

    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (editingPlan) {
        await apiRequest(`/api/admin/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            price: numPrice,
            dailyRoiPercent: numRoi,
            validityDays: numDays,
            badge,
            description,
            features,
            isActive,
          }),
        });
        success(`Plan ${name} updated successfully.`);
      } else {
        await apiRequest('/api/admin/plans', {
          method: 'POST',
          body: JSON.stringify({
            name,
            price: numPrice,
            dailyRoiPercent: numRoi,
            validityDays: numDays,
            badge,
            description,
            features,
            isActive,
          }),
        });
        success(`New Plan ${name} published successfully.`);
      }

      setIsModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      error(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete "${planName}"? Existing subscriptions will remain intact.`)) {
      return;
    }
    try {
      await apiRequest(`/api/admin/plans/${id}`, { method: 'DELETE' });
      success(`Plan ${planName} deleted.`);
      await fetchPlans();
    } catch (err: any) {
      error(err.message || 'Failed to delete plan');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-rose-400" />
            Investment Plans Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dynamic tier management: add custom packages, adjust daily yields, validity, and features.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Plan Tier</span>
        </button>
      </div>

      {/* Plans list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No plans configured. Click "Add New Plan Tier" to create one.
          </div>
        ) : (
          plans.map((p) => (
            <div
              key={p.id}
              className={`bg-[#0e1628]/90 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                p.isActive ? 'border-slate-800' : 'border-rose-900/30 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {p.badge}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.isActive
                        ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                        : 'text-slate-400 bg-slate-800'
                    }`}
                  >
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 text-center">{p.name}</h3>

                {/* Strictly 4 Metrics: Price, Earning, Validity, Total Profit */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 mb-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Price</span>
                    <span className="text-base font-extrabold text-white font-mono">${p.price.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-slate-800/80" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Earning</span>
                    <span className="font-bold text-amber-400 font-mono">${p.dailyIncome.toFixed(2)} / Day</span>
                  </div>
                  <div className="h-px bg-slate-800/80" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Validity</span>
                    <span className="font-bold text-slate-200">{p.validityDays} Days</span>
                  </div>
                  <div className="h-px bg-slate-800/80" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Total Profit</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      ${((p.dailyIncome * p.validityDays) || ((p.price * p.totalReturnPercent) / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(p)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeletePlan(p.id, p.name)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? `Edit ${editingPlan.name}` : 'Create New Investment Tier'}
        subtitle="Configure pricing, yields, validity, and presentation flags."
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Plan Name</label>
            <input
              type="text"
              placeholder="e.g. Platinum Tier"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Price ($)</label>
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Daily ROI %</label>
              <input
                type="number"
                step="any"
                value={dailyRoiPercent}
                onChange={(e) => setDailyRoiPercent(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Validity (Days)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Badge / Tag</label>
              <input
                type="text"
                placeholder="e.g. Most Popular"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500"
                />
                Published (Active)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="Short plan summary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Features (One per line)
            </label>
            <textarea
              rows={3}
              placeholder="Instant daily settlement&#10;Principal returned at maturity&#10;Dedicated account manager"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
            >
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
