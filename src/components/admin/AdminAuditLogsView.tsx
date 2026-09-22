import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { AuditLog } from '../../types';
import { ShieldCheck, Search, Clock, FileText, UserCheck } from 'lucide-react';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      const data = await apiRequest<{ logs: AuditLog[] }>('/api/admin/audit-logs');
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.adminUsername || l.adminName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.targetUser && l.targetUser.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-rose-400" />
            Compliance & Security Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable log tracking administrative approvals, rejections, manual balance interventions, and configuration edits.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/60"
          />
        </div>
      </div>

      <div className="bg-[#0e1628]/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-900/50">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Staff Operator</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Account</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading compliance logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-rose-400" />
                      <span>{log.adminUsername || log.adminName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-amber-400 border border-slate-700 uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {log.targetUser || 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-sm truncate">
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
