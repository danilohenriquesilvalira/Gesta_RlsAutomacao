'use client';

import { cn } from '@/lib/utils';
import type { TipoHora } from '@/types';

const options: { value: TipoHora; label: string; activeClass: string }[] = [
  { value: 'normal',    label: 'Normal',    activeClass: 'bg-accent-blue text-white border-accent-blue' },
  { value: 'extra_50',  label: 'Extra 50%', activeClass: 'bg-warning text-white border-warning' },
  { value: 'extra_100', label: 'Extra 100%',activeClass: 'bg-error text-white border-error' },
];

interface HoraTypeSelectorProps {
  value: TipoHora;
  onChange: (value: TipoHora) => void;
}

export function HoraTypeSelector({ value, onChange }: HoraTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 h-10 rounded-xl text-xs font-bold tracking-wide transition-all border',
            value === opt.value
              ? opt.activeClass
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
