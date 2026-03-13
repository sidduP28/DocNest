import { Clock } from 'lucide-react';

const COLORS = {
  green: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  amber: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  red:   { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

export default function WaitTimeBadge({ estimatedWaitMinutes, waitColor, waitLabel, size = 'sm' }) {
  const style = COLORS[waitColor] || COLORS.green;

  return (
    <div className={`flex items-center gap-1.5 rounded-full font-medium border ${size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'}`} style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}>
      <Clock size={size === 'lg' ? 14 : 12} />
      <span>{waitLabel}</span>
    </div>
  );
}
