'use client';

import { useRef, useState } from 'react';
import { api, API_URL } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useApontamentos } from '@/lib/queries/apontamentos';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { Clock, ListChecks, TrendingUp, Image, LogOut, Camera, Trash2, Pencil, X } from 'lucide-react';

export default function PerfilPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { data: apontamentos = [] } = useApontamentos(
    profile ? { tecnicoId: profile.id } : undefined
  );
  const [uploading,   setUploading]   = useState(false);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalHoras        = apontamentos.reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const totalApontamentos = apontamentos.length;
  const horasExtras       = apontamentos
    .filter((a) => a.tipo_hora !== 'normal')
    .reduce((s, a) => s + (a.total_horas ?? 0), 0);
  const totalFotos = apontamentos.reduce((s, a) => s + (a.fotos?.length ?? 0), 0);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    e.target.value = '';
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/profiles/${profile.id}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      await refreshProfile();
      toast.success('Foto de perfil actualizada!');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar a foto');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile) return;
    setUploading(true);
    try {
      await api.delete(`/api/profiles/${profile.id}/avatar`);
      await refreshProfile();
      toast.success('Foto de perfil removida');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover a foto');
    } finally {
      setUploading(false);
    }
  }

  const AvatarDisplay = ({ size }: { size: 'md' | 'lg' }) => {
    const dim = size === 'lg' ? 'w-28 h-28' : 'w-20 h-20 sm:w-24 sm:h-24';
    const text = size === 'lg' ? 'text-4xl' : 'text-2xl sm:text-3xl';
    return (
      <div className={`${dim} rounded-full overflow-hidden bg-navy/80 border-4 border-white/20 flex items-center justify-center shrink-0`}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
        ) : (
          <span className={`${text} font-black text-white select-none`}>{initials}</span>
        )}
      </div>
    );
  };

  const stats = [
    { icon: <Clock className="w-5 h-5 text-accent-blue" />,      value: `${totalHoras.toFixed(0)}h`, label: 'Total Horas'  },
    { icon: <ListChecks className="w-5 h-5 text-emerald-500" />,  value: totalApontamentos,            label: 'Registos'    },
    { icon: <TrendingUp className="w-5 h-5 text-warning" />,      value: `${horasExtras.toFixed(0)}h`, label: 'Horas Extras' },
    { icon: <Image className="w-5 h-5 text-purple-500" />,        value: totalFotos,                   label: 'Fotos'       },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PageHeader title="Perfil" />

      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <div className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-success" />

        <div className="pl-5 pr-4 sm:pr-6 py-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar (clicável) */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="relative group shrink-0 focus:outline-none"
            aria-label="Editar foto de perfil"
          >
            <AvatarDisplay size="md" />
            <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-navy border-2 border-white flex items-center justify-center shadow">
              <Pencil className="w-2.5 h-2.5 text-white" />
            </span>
          </button>

          {/* Info */}
          <div className="text-center sm:text-left flex-1 min-w-0 pt-0 sm:pt-1">
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight leading-tight">
              {profile?.full_name}
            </h1>
            <p className="text-[11px] font-bold text-success uppercase tracking-widest mt-1">
              Técnico de Campo
            </p>
            {profile?.email && (
              <p className="text-xs text-gray-muted mt-0.5 truncate">{profile.email}</p>
            )}
          </div>

          {/* Edit button — desktop */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="hidden sm:flex items-center gap-2 shrink-0 h-9 px-4 rounded-xl border border-gray-border text-sm font-medium text-gray-text hover:bg-gray-bg hover:border-navy/30 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Editar foto
          </button>
        </div>

        {/* Mobile — editar foto link */}
        <div className="sm:hidden pb-4 flex justify-center border-t border-gray-border/50">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-3 flex items-center gap-1.5 text-xs text-gray-muted hover:text-navy transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Editar foto de perfil
          </button>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="relative bg-white rounded-xl border border-gray-border shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-border/60" />
            <div className="pl-5 pr-4 py-4 text-center">
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-2xl font-black text-navy">{s.value}</p>
              <p className="text-[10px] font-bold text-gray-muted uppercase tracking-tighter mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Logout ────────────────────────────────────────────────────────── */}
      <div className="pt-1">
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl border-error/40 text-error hover:bg-error hover:text-white hover:border-error font-bold transition-all flex items-center justify-center gap-2"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          Terminar Sessão
        </Button>
      </div>

      {/* ── Avatar Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[92vw] sm:w-full sm:max-w-xs p-0 rounded-2xl border-gray-border/80 shadow-xl overflow-hidden gap-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-border/60">
            <div>
              <p className="text-[15px] font-semibold text-navy leading-tight">Foto de Perfil</p>
              <p className="text-[11px] text-gray-muted mt-0.5">Personalize o seu perfil</p>
            </div>
            <DialogClose className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-muted hover:bg-gray-bg hover:text-navy transition-colors">
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          {/* Body */}
          <div className="px-5 py-6 flex flex-col items-center gap-5">
            {/* Avatar preview */}
            <div className="relative">
              <AvatarDisplay size="lg" />
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-10 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-navy/20"
              >
                <Camera className="w-4 h-4" />
                {profile?.avatar_url ? 'Alterar foto' : 'Carregar foto'}
              </button>

              {profile?.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="w-full h-10 rounded-xl border border-error/30 text-error text-sm font-medium hover:bg-error/5 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover foto
                </button>
              )}
            </div>

            <p className="text-[10px] text-gray-muted text-center leading-relaxed">
              JPG, PNG ou WebP · Máximo 5 MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
