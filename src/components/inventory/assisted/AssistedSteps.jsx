import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'nota', label: 'Nota fiscal' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'concluido', label: 'Concluído' },
];

export default function AssistedSteps({ current }) {
  const currentIndex = STEPS.findIndex((step) => step.key === current);

  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2 py-1 sm:px-3 text-[11px] sm:text-xs font-medium whitespace-nowrap',
                done && 'bg-emerald-50 text-emerald-700',
                active && 'bg-[#6B3FA0] text-white shadow-sm shadow-[#6B3FA0]/25',
                !done && !active && 'bg-slate-100 text-slate-500'
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  done && 'bg-emerald-600 text-white',
                  active && 'bg-white text-[#6B3FA0]',
                  !done && !active && 'bg-white text-slate-500'
                )}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : index + 1}
              </span>
              {step.label}
            </div>
            {index < STEPS.length - 1 && <div className="h-px flex-1 bg-slate-200 min-w-2" />}
          </div>
        );
      })}
    </div>
  );
}