import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { PromoCode } from '../../types';
import { Ticket, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';

export const AdminPromoCodesView: React.FC = () => {
  const { success, error } = useToast();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [rewardAmount, setRewardAmount] = useState('10');
  const [usageLimit, setUsageLimit] = useState('100');
  const [expiryDays, setExpiryDays] = useState('30');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPromos = async () => {
    try {
      const data = await apiRequest<{ promos?: PromoCode[]; promoCodes?: PromoCode[] }>('/api/admin/promo-codes');
      setPromos(data.promos || data.promoCodes || []);
    } catch (err) {
      console.error('Failed to load promo codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rew = parseFloat(rewardAmount);
    const limit = parseInt(usageLimit);
    const days = parseInt(expiryDays);

    if (!code.trim() || isNaN(rew) || isNaN(limit)) {
      error('Please check code and numeric fields.');
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (days || 30));

    setSaving(true);
    try {
      await apiRequest('/api/admin/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          rewardAmount: rew,
          usageLimit: limit,
          expiryDate: expiryDate.toISOString(),
          description: description.trim() || 'Promotional cash voucher',
        }),
      });

      success(`Promo code ${code.toUpperCase()} published!`);
      setIsModalOpen(false);
      setCode('');
      await fetchPromos();
    } catch (err: any) {
      error(err.message || 'Failed to create promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (!confirm(`Delete coupon code ${codeName}?`)) return;
    try {
      await apiRequest(`/api/admin/promo-codes/${id}`, { method: 'DELETE' });
      success(`Code ${codeName} deleted.`);
      await fetchPromos();
    } catch (err: any) {
      error(err.message || 'Failed to delete promo');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Ticket className="w-6 h-6 text-rose-400" />
            Promotional Voucher Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create single-use or multi-user reward vouchers that directly credit user wallet balances upon redemption.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Promo Voucher</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading coupons...</div>
        ) : promos.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No active promo codes. Click Issue New Promo Voucher to create one.
          </div>
        ) : (
          promos.map((p) => (
            <div
              key={p.id}
              className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-extrabold text-lg text-amber-400 tracking-wider">
                    {p.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    +${p.rewardAmount.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">{p.description}</p>

                <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Usage Progress:</span>
                    <span className="font-mono font-bold text-white">
                      {p.usedCount} / {p.usageLimit}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Expiry Date:</span>
                    <span className="text-slate-300">
                      {new Date(p.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={() => handleDelete(p.id, p.code)}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Issue New Promo Voucher"
        subtitle="Voucher credits balance immediately when entered by eligible users."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Coupon Code</label>
            <input
              type="text"
              placeholder="e.g. MEGA50"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm uppercase focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reward ($)</label>
              <input
                type="number"
                step="any"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Uses</label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Valid (Days)</label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="e.g. VIP community launch bonus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {saving ? 'Creating...' : 'Publish Code'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
