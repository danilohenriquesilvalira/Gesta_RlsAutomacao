'use client';

interface RlsLogoProps {
  height?: number;
  className?: string;
  /** Desactiva as animações (útil em contextos onde já há transição de página) */
  noAnimation?: boolean;
}

/**
 * Logo oficial Gestão RLS.
 * Animação de entrada + brilho suave contínuo no ícone.
 */
export function RlsLogo({ height = 36, className = '', noAnimation = false }: RlsLogoProps) {
  return (
    <>
      <style>{`
        @keyframes rlsIn {
          from { opacity: 0; transform: scale(0.88) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes rlsGlow {
          0%,100% { filter: drop-shadow(0 0 0px rgba(55,198,30,0)); }
          50%      { filter: drop-shadow(0 0 8px rgba(55,198,30,0.38)); }
        }
        .rls-logo {
          display: block;
          width: auto;
        }
        .rls-logo-animated {
          animation:
            rlsIn  0.55s cubic-bezier(0.22, 1, 0.36, 1) both,
            rlsGlow 3.2s ease-in-out 0.9s infinite;
        }
      `}</style>
      <img
        src="/Logo_Rls.svg"
        alt="Gestão RLS"
        draggable={false}
        className={`rls-logo${noAnimation ? '' : ' rls-logo-animated'} ${className}`}
        style={{ height }}
      />
    </>
  );
}
