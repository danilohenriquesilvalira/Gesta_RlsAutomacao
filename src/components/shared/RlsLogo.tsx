'use client';

interface RlsLogoProps {
  height?: number;
  className?: string;
}

export function RlsLogo({ height = 36, className = '' }: RlsLogoProps) {
  return (
    <img
      src="/Logo_Rls.svg"
      alt="Gestão RLS"
      draggable={false}
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}
