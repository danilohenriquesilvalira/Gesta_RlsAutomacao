'use client';

import { useAuth } from '@/hooks/useAuth';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function PerfilPage() {
  const { profile, signOut } = useAuth();
  const { data: apontamentos = [] } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );

  const totalHoras = apontamentos.reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const totalApontamentos = apontamentos.length;
  const horasExtras = apontamentos
    .filter((a) => a.tipo_hora !== 'normal')
    .reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const totalFotos = apontamentos.reduce(
    (s, a) => s + (a.fotos?.length ?? 0),
    0
  );

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-border p-6 text-center">
        <Avatar className="w-20 h-20 mx-auto mb-3">
          <AvatarFallback className="bg-navy text-white text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-bold text-navy">
          {profile?.full_name}
        </h1>
        <p className="text-sm text-gray-muted">Técnico de Campo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-2xl font-bold text-navy">{totalHoras.toFixed(0)}h</p>
          <p className="text-xs text-gray-muted">Total Horas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-2xl font-bold text-accent-blue">{totalApontamentos}</p>
          <p className="text-xs text-gray-muted">Apontamentos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-2xl font-bold text-warning">{horasExtras.toFixed(0)}h</p>
          <p className="text-xs text-gray-muted">Horas Extras</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{totalFotos}</p>
          <p className="text-xs text-gray-muted">Fotos</p>
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full border-error text-error hover:bg-error hover:text-white"
        onClick={signOut}
      >
        Sair da Conta
      </Button>
    </div>
  );
}
