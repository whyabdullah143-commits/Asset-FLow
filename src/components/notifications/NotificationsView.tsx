import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Notification } from '../../types';
import { Bell, CheckCheck, Info, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface NotificationsViewProps {
  onRefreshBadge?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onRefreshBadge }) => {
  const { user } = useAuth();
  const { success } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ notifications: Notification[] }>('/api/user/notifications');
      setNotifications(data.notifications || []);
    } catch (err: any) {
      if (!err?.message?.includes('Session expired')) {
        console.warn('Unable to load notifications:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/api/user/notifications/mark-all-read', { method: 'POST' });
      success('All notifications marked as read.');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onRefreshBadge) onRefreshBadge();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-400" />
            Activity & Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Stay informed on deposits, daily ROI settlements, withdrawals, and network events.
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-amber-400" />
            <span>Mark All As Read</span>
          </button>
        )}
      </div>

      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl p-6">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  !n.isRead
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-800 shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
