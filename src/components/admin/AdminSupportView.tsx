import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SupportTicket } from '../../types';
import {
  Headphones,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';

export const AdminSupportView: React.FC = () => {
  const { success, error } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  const fetchTickets = async () => {
    try {
      const data = await apiRequest<{ tickets: SupportTicket[] }>('/api/admin/support/tickets');
      setTickets(data.tickets || []);
      if (selectedTicket) {
        const updated = (data.tickets || []).find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await apiRequest<{ ticket: SupportTicket }>(
        `/api/admin/support/tickets/${selectedTicket.id}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: replyText.trim(),
            status: newStatus || 'answered',
          }),
        }
      );

      success('Official reply sent to user.');
      setReplyText('');
      setSelectedTicket(res.ticket);
      await fetchTickets();
    } catch (err: any) {
      error(err.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Headphones className="w-6 h-6 text-rose-400" />
          Support Desk & Ticket Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Respond to user inquiries regarding deposit verifications, withdrawal queries, or technical assistance.
        </p>
      </div>

      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No tickets in queue.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white max-w-xs truncate">{t.subject}</td>
                    <td className="py-3 px-4 text-slate-300">{t.userName}</td>
                    <td className="py-3 px-4 uppercase text-xs text-slate-400">{t.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-300'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={t.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setNewStatus(t.status);
                        }}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
                      >
                        Open Thread ({(t.messages || []).length})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Reply Modal */}
      <Modal
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject || 'Support Ticket'}
        subtitle={selectedTicket ? `From ${selectedTicket.userName} • Category: ${selectedTicket.category.toUpperCase()}` : ''}
        maxWidth="max-w-3xl"
      >
        {selectedTicket && (
          <div className="space-y-4">
            {/* Conversation list */}
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar p-2 bg-slate-900/50 rounded-2xl border border-slate-800">
              {(selectedTicket.messages || []).map((m) => {
                const isAdmin = m.senderRole === 'admin';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1.5">
                      <span className="font-bold text-white">{m.senderName}</span>
                      <span>({isAdmin ? 'Staff' : 'User'})</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[80%] leading-relaxed ${
                        isAdmin
                          ? 'bg-rose-500/20 text-rose-100 border border-rose-500/30 rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Response action */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-300">Set Ticket Status:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/60"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed / Resolved</option>
                </select>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder="Type your official administrative reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500/60"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors self-end flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Response</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
