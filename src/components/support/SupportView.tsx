import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLiveSettings } from '../../context/LiveSettingsContext';
import { apiRequest } from '../../lib/api';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SupportTicket } from '../../types';
import {
  HelpCircle,
  MessageSquare,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  ShieldCheck,
  User,
  Headphones,
  Phone,
  Mail,
  Send as TelegramIcon,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';

export const SupportView: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const { settings } = useLiveSettings();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New ticket modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'deposit' | 'withdrawal' | 'plan' | 'general'>('deposit');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [initialMessage, setInitialMessage] = useState('');
  const [creating, setCreating] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the automated daily ROI cycle work?',
      a: 'Once an investment tier is activated, yields accrue continuously into your daily ledger. You can claim your daily returns every 24 hours directly from the Dashboard or Earnings page into your available liquid balance.',
    },
    {
      q: 'How long do deposit approvals usually take?',
      a: 'Deposits made via JazzCash, Easypaisa, Bank IBFT, or USDT are reviewed by compliance officers within 15–30 minutes. Once your Transaction Reference ID (TID) is verified on the network, your balance is credited immediately.',
    },
    {
      q: 'What are the minimum withdrawal requirements?',
      a: 'The minimum withdrawal is $10.00 USD. Payout requests are verified and disbursed to your designated mobile wallet or bank account within 1–2 hours during business shifts.',
    },
    {
      q: 'How does the referral and milestone program work?',
      a: 'When an investor registers using your referral link, you receive an instant 6.00% direct cash bonus whenever they activate an investment package. Additionally, unlocking active member tiers (e.g. 5, 10, 20 members) grants one-off milestone rewards up to $600.',
    },
  ];

  const fetchTickets = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ tickets: SupportTicket[] }>('/api/support/my');
      setTickets(data.tickets || []);
      if (selectedTicket) {
        const updated = (data.tickets || []).find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load tickets:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) {
      error('Please complete subject and message.');
      return;
    }

    setCreating(true);
    try {
      const res = await apiRequest<{ ticket: SupportTicket }>('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          message: initialMessage.trim(),
        }),
      });

      success('Support ticket created! A specialist will review your request.');
      setIsModalOpen(false);
      setSubject('');
      setInitialMessage('');
      await fetchTickets();
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      error(err.message || 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await apiRequest<{ ticket: SupportTicket }>(
        `/api/support/tickets/${selectedTicket.id}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ message: replyText.trim() }),
        }
      );

      success('Reply sent!');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-emerald-400" />
            Help Center & Support Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse our knowledgebase or open a secure ticket with our financial operations desk.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Open New Support Ticket</span>
        </button>
      </div>

      {/* Live Direct Contact Channels from Global Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {settings.supportWhatsApp && (
          <a
            href={settings.supportWhatsApp}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-[#0e1628]/90 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Instant Response</p>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">WhatsApp Support</h4>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        )}

        {settings.supportTelegram && (
          <a
            href={settings.supportTelegram}
            target="_blank"
            rel="noreferrer"
            className="p-4 rounded-2xl bg-[#0e1628]/90 border border-sky-500/20 hover:border-sky-500/50 hover:bg-sky-950/20 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <TelegramIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Broadcast & Community</p>
                <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">Telegram Channel</h4>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-sky-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        )}

        {settings.supportEmail && (
          <a
            href={`mailto:${settings.supportEmail}`}
            className="p-4 rounded-2xl bg-[#0e1628]/90 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-950/20 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs text-slate-400 font-medium">Executive Support</p>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                  {settings.supportEmail}
                </h4>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </a>
        )}

        {settings.supportPhone && (
          <a
            href={`tel:${settings.supportPhone}`}
            className="p-4 rounded-2xl bg-[#0e1628]/90 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Helpline Operations</p>
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {settings.supportPhone}
                </h4>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: FAQ Section */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-4 py-3 text-left font-semibold text-xs sm:text-sm text-white flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3.5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-2">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: User Tickets List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                My Support Tickets
              </h2>
              <span className="text-xs text-slate-400">{tickets.length} Active</span>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
              {loading ? (
                <div className="py-8 text-center text-slate-500 text-xs">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No tickets opened yet. If you have an inquiry regarding a deposit or withdrawal, click "Open New Support Ticket" above.
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTicket?.id === t.id
                        ? 'bg-amber-500/10 border-amber-500/60'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-xs sm:text-sm truncate max-w-[200px]">
                        {t.subject}
                      </span>
                      <Badge status={t.status} />
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="uppercase font-semibold text-slate-300">{t.category}</span>
                      <span>•</span>
                      <span>{(t.messages || []).length} messages</span>
                      <span>•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Details & Conversation Modal */}
      <Modal
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject || 'Support Ticket'}
        subtitle={selectedTicket ? `Ticket ID: #${selectedTicket.id.substring(0, 8)} • Status: ${selectedTicket.status}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-4">
            {/* Conversation Thread */}
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar p-2">
              {(selectedTicket.messages || []).map((m) => {
                const isUser = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1.5">
                      <span className="font-bold text-white">{m.senderName}</span>
                      <span>({m.senderRole === 'admin' ? 'Support Desk' : 'You'})</span>
                      <span>•</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                        isUser
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Form */}
            {selectedTicket.status !== 'closed' ? (
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your response to support..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            ) : (
              <div className="p-3 text-center text-xs text-slate-500 bg-slate-900 rounded-xl">
                This ticket has been marked as resolved and closed.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Ticket Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Open Support Ticket"
        subtitle="Our operational team typically responds within 15–30 minutes."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
            <input
              type="text"
              placeholder="e.g. Deposit TID #829188 verification query"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
              >
                <option value="deposit">Deposit Inquiry</option>
                <option value="withdrawal">Withdrawal Inquiry</option>
                <option value="plan">Investment Plan</option>
                <option value="general">General Help</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
              >
                <option value="low">Standard</option>
                <option value="medium">Medium</option>
                <option value="high">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message</label>
            <textarea
              rows={4}
              placeholder="Describe your issue with reference numbers, amounts, or timestamps..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500/60"
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
              disabled={creating}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              {creating ? 'Creating...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
