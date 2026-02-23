'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export interface TecnicoRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  horasNormais: number;
  horasExtras: number;
  totalHoras: number;
  obraAtual: string | null;
}

interface TecnicosTableProps {
  tecnicos: TecnicoRow[];
  onSelect?: (id: string) => void;
  onEdit?: (tecnico: TecnicoRow) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatHoras(h: number): string {
  return `${h.toFixed(1)}h`;
}

const MAX_HORAS_SEMANA = 44;

export function TecnicosTable({ tecnicos, onSelect, onEdit }: TecnicosTableProps) {
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-border hover:bg-transparent bg-gray-50/50">
            <TableHead className="text-gray-muted pl-6 h-10">Técnico</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Obra Atual</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Horas Normais</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Horas Extras</TableHead>
            <TableHead className="text-gray-muted text-center h-10">Total Horas</TableHead>
            <TableHead className="text-gray-muted text-center pr-6 h-10">Progresso</TableHead>
            <TableHead className="w-[52px] h-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tecnicos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-gray-muted">
                Nenhum técnico encontrado.
              </TableCell>
            </TableRow>
          ) : (
            tecnicos.map((tec) => {
              const progressValue = Math.min((tec.totalHoras / MAX_HORAS_SEMANA) * 100, 100);
              const isOvertime = tec.totalHoras > MAX_HORAS_SEMANA;

              return (
                <TableRow
                  key={tec.id}
                  className="border-gray-border cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => onSelect?.(tec.id)}
                >
                  <TableCell className="pl-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {tec.avatar_url ? (
                          <AvatarImage src={tec.avatar_url} alt={tec.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-accent-blue/10 text-[10px] text-accent-blue font-bold">
                          {getInitials(tec.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-navy leading-none mb-1">{tec.full_name}</span>
                        <span className="text-[10px] text-gray-muted">ID: {tec.id.slice(0, 5)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-center text-gray-text px-4">
                    {tec.obraAtual || <span className="text-gray-muted italic">Sem obra</span>}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-gray-text px-4">
                    {formatHoras(tec.horasNormais)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm px-4">
                    <span className={tec.horasExtras > 0 ? 'font-bold text-warning' : 'text-gray-text'}>
                      {formatHoras(tec.horasExtras)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm font-bold text-navy px-4">
                    {formatHoras(tec.totalHoras)}
                  </TableCell>
                  <TableCell className="pr-6 py-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-24">
                        <Progress
                          value={progressValue}
                          className={`h-1.5 ${isOvertime ? '[&>[data-slot=progress-indicator]]:bg-warning' : '[&>[data-slot=progress-indicator]]:bg-blue-600'}`}
                        />
                      </div>
                      <span className={`text-[10px] font-bold min-w-[30px] text-right ${isOvertime ? 'text-warning' : 'text-gray-muted'}`}>
                        {Math.round(progressValue)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pr-3 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(tec);
                      }}
                      title="Editar técnico"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-muted hover:text-navy hover:bg-gray-100 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
