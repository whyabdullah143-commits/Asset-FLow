import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { TeamMilestone } from '../../types';
import { Award, Plus, Trash2, Edit2, Users } from 'lucide-react';

export const AdminMilestonesView: React.FC = () => {
  const { success, error } = useToast();
  const [milestones, setMilestones] = useState<TeamMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<TeamMilestone | null>(null);
  const [title, setTitle] = useState('');
  const [requiredActiveMembers, setRequiredActiveMembers] = useState('10');
  const [bonusReward, setBonusReward] = useState('20');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMilestones = async () => {
    try {
      const data = await apiRequest<{ milestones: TeamMilestone[] }>('/api/admin/milestones');
      setMilestones(data.milestones || []);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, []);

  const openCreateModal = () => {
    setEditingMilestone(null);
    setTitle('');
    setRequiredActiveMembers('10');
    setBonusReward('20');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (m: TeamMilestone) => {
    setEditingMilestone(m);
    setTitle(m.title);
    setRequiredActiveMembers((m.requiredActiveMembers ?? m.requiredMembers ?? 10).toString());
    setBonusReward((m.bonusReward ?? m.rewardAmount ?? 20).toString());
    setDescription(m.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const req = parseInt(requiredActiveMembers, 10);
    const rew = parseFloat(bonusReward);

    if (!title.trim() || isNaN(req) || isNaN(rew) || rew <= 0) {
      error('Please fill in all fields correctly with a positive reward amount.');
      return;
    }

    setSaving(true);
    try {
      if (editingMilestone) {
        await apiRequest(`/api/admin/milestones/${editingMilestone.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            requiredActiveMembers: req,
            bonusReward: rew,
            description: description.trim() || `Reach ${req} active team members to claim cash bonus.`,
          }),
        });
        success(`Milestone "${title}" updated successfully!`);
      } else {
        await apiRequest('/api/admin/milestones', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            requiredActiveMembers: req,
            bonusReward: rew,
            description: description.trim() || `Reach ${req} active team members to claim cash bonus.`,
          }),
        });
        success(`Milestone "${title}" created!`);
      }

      setIsModalOpen(false);
      await fetchMilestones();
    } catch (err: any) {
      error(err.message || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, milestoneTitle: string) => {
    if (!confirm(`Delete milestone "${milestoneTitle}"?`)) return;
    try {
      await apiRequest(`/api/admin/milestones/${id}`, { method: 'DELETE' });
      success(`Milestone removed.`);
      await fetchMilestones();
    } catch (err: any) {
      error(err.message || 'Failed to delete milestone');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-rose-400" />
            Team Referral Ranks & Milestones
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure one-time dollar rewards granted when investors build frontline networks (10, 20, 30, 50, 100 members). You can edit bonus amounts or delete anytime.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rank Milestone</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading milestones...</div>
        ) : milestones.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No milestones configured.
          </div>
        ) : (
          milestones.map((m) => (
            <div
              key={m.id}
              className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-base">{m.title}</span>
                  <span className="font-mono text-emerald-400 font-extrabold text-sm">
                    +${(m.bonusReward ?? m.rewardAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">{m.description}</p>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Target:
                  </span>
                  <span className="font-bold text-white">
                    {m.requiredActiveMembers ?? m.requiredMembers} Active Investors
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(m)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.title)}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMilestone ? 'Edit Rank Milestone' : 'Create Team Milestone'}
        subtitle="Specify required active investor count and dollar cash bonus."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rank Title</label>
            <input
              type="text"
              placeholder="e.g. Silver Leader (20 Members)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Required Members (10, 20, 30, etc.)
              </label>
              <input
                type="number"
                value={requiredActiveMembers}
                onChange={(e) => setRequiredActiveMembers(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bonus Cash Reward ($ USD)
              </label>
              <input
                type="number"
                step="any"
                value={bonusReward}
                onChange={(e) => setBonusReward(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="Short explanation for the user"
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : editingMilestone ? 'Update Milestone' : 'Add Milestone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
