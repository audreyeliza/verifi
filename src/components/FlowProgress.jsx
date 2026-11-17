import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Consent', 'Your info', 'Review', 'Apply'];

export default function FlowProgress({ current }) {
  return (
    <ol className="mb-8 flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  done && 'bg-verify text-white',
                  active && 'bg-brand text-white',
                  !done && !active && 'bg-secondary text-muted-foreground'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-[12.5px] font-medium sm:block',
                  active ? 'text-brand' : 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn('h-px flex-1 rounded-full', done ? 'bg-verify/40' : 'bg-border')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}