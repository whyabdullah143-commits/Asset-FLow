import React from 'react';

export interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const norm = status.toLowerCase();

  let style = 'bg-slate-800/80 text-slate-300 border-slate-700';

  if (norm === 'active' || norm === 'approved' || norm === 'completed') {
    style = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  } else if (norm === 'pending' || norm === 'open') {
    style = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  } else if (norm === 'rejected' || norm === 'blocked' || norm === 'closed' || norm === 'failed') {
    style = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  } else if (norm === 'answered') {
    style = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  } else if (norm === 'expired' || norm === 'exhausted' || norm === 'inactive') {
    style = 'bg-slate-800 text-slate-400 border-slate-700';
  }

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label}
    </span>
  );
};
