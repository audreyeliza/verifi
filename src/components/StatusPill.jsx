import { cn } from '@/lib/utils';

const STYLES = {
  'Not started': 'bg-secondary text-navy-muted ring-border',
  Verified: 'bg-blue-50 text-blue-700 ring-blue-100',
  Applied: 'bg-amber-50 text-amber-700 ring-amber-100',
  Approved: 'bg-verify-soft text-verify ring-green-100',
  Submitted: 'bg-amber-50 text-amber-700 ring-amber-100',
  'Under review': 'bg-blue-50 text-blue-700 ring-blue-100',
  Denied: 'bg-rose-50 text-rose-700 ring-rose-100',
  'Likely eligible': 'bg-verify-soft text-verify ring-green-100',
  'Needs review': 'bg-amber-50 text-amber-700 ring-amber-100',
  'Self-reported': 'bg-secondary text-navy-muted ring-border',
  'Uploaded document': 'bg-blue-50 text-blue-700 ring-blue-100',
  'Verified at source': 'bg-verify-soft text-verify ring-green-100',
};

export default function StatusPill({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset',
        STYLES[status] ?? STYLES['Not started'],
        className
      )}
    >
      {status}
    </span>
  );
}