'use client'

import { Button } from '@/components/ui/button'

interface HeroTimerProps {
  isRunning: boolean
  elapsed: string
  obraName?: string
  servicoName?: string
  onStop: () => void
  onStart: () => void
}

export function HeroTimer({
  isRunning,
  elapsed,
  obraName,
  servicoName,
  onStop,
  onStart,
}: HeroTimerProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-navy to-navy-light p-6 shadow-lg">
      {isRunning ? (
        <div className="flex flex-col items-center gap-4 text-white">
          {/* Active service info */}
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/70"
            >
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm font-medium text-white/80">
              {obraName}
            </span>
          </div>

          <span className="text-xs font-medium uppercase tracking-wider text-white/60">
            {servicoName}
          </span>

          {/* Timer display */}
          <div className="relative my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-5xl font-bold tracking-tight">
                {elapsed}
              </span>
            </div>
            {/* Pulsing dot indicator */}
            <span className="absolute -right-4 top-1 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex w-full gap-3">
            <Button
              onClick={onStop}
              className="flex-1 bg-error font-semibold text-white hover:bg-error/90"
              size="lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Encerrar Jornada
            </Button>

            <Button
              onClick={onStart}
              variant="outline"
              className="flex-1 border-white/30 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
              size="lg"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Novo Servico
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 py-4 text-white">
          {/* Idle icon */}
          <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/60"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold">Nenhum servico ativo</p>
            <p className="mt-1 text-sm text-white/60">
              Inicie um servico para comecar a registrar horas
            </p>
          </div>

          <Button
            onClick={onStart}
            className="w-full bg-accent-blue font-semibold text-white hover:bg-accent-blue/90"
            size="lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            Iniciar
          </Button>
        </div>
      )}
    </div>
  )
}
