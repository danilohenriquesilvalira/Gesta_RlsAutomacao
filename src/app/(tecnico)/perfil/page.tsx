'use client';

import { useAuth } from '@/hooks/useAuth';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, ListChecks, TrendingUp, Camera, LogOut } from 'lucide-react';

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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-border p-8 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-gray-50 shadow-inner">
          <AvatarFallback className="bg-navy text-white text-3xl font-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-black text-navy tracking-tight">
          {profile?.full_name}
        </h1>
        <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mt-1">
          Técnico de Campo
        </p>
        <p className="text-xs text-gray-muted mt-0.5">{profile?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-2xl border border-gray-border p-4 text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <Clock className="w-5 h-5 text-accent-blue" />
          </div>
          <p className="text-2xl font-black text-navy">{totalHoras.toFixed(0)}h</p>
          <p className="text-[10px] font-bold text-gray-muted uppercase tracking-tighter">Total Horas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-border p-4 text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <ListChecks className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-navy">{totalApontamentos}</p>
          <p className="text-[10px] font-bold text-gray-muted uppercase tracking-tighter">Registos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-border p-4 text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-black text-navy">{horasExtras.toFixed(0)}h</p>
          <p className="text-[10px] font-bold text-gray-muted uppercase tracking-tighter">Horas Extras</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-border p-4 text-center shadow-sm">
          <div className="flex justify-center mb-2">
            <Camera className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-navy">{totalFotos}</p>
          <p className="text-[10px] font-bold text-gray-muted uppercase tracking-tighter">Fotos</p>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4">
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-error text-error hover:bg-error hover:text-white font-bold transition-all flex items-center justify-center gap-2"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Terminar Sessão
        </Button>
      </div>
    </div>
  );
}
