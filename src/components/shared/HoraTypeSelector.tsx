'use client';

import { cn } from '@/lib/utils';
import type { TipoHora } from '@/types';

const options: { value: TipoHora; label: string; color: string }[] = [
  { value: 'normal', label: 'Normal', color: 'bg-accent-blue text-white' },
  { value: 'extra_50', label: 'Extra 50%', color: 'bg-warning text-white' },
  { value: 'extra_100', label: 'Extra 100%', color: 'bg-error text-white' },
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
            'flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all border-2',
            value === opt.value
              ? `${opt.color} border-transparent shadow-md`
              : 'bg-white text-gray-text border-gray-border hover:border-gray-muted'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
