'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { RlsLogo } from '@/components/shared/RlsLogo';

// ── Typewriter ─────────────────────────────────────────────────────────────────
const PHRASES = [
  'Automação de processos industriais.',
  'Montagem de painéis eléctricos.',
  'Sistemas de controlo avançados.',
  'Instalações eléctricas industriais.',
  'Engenharia de automação.',
  'Programação de autómatos.',
];

function Typewriter() {
  const [text, setText]           = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const current = PHRASES[phraseIdx];
    let t: ReturnType<typeof setTimeout>;

    if (!deleting && text === current) {
      t = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && text === '') {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % PHRASES.length);
    } else {
      t = setTimeout(() => {
        setText(deleting ? text.slice(0, -1) : current.slice(0, text.length + 1));
      }, deleting ? 35 : 75);
    }

    return () => clearTimeout(t);
  }, [text, deleting, phraseIdx]);

  return (
    <div className="text-center px-6 max-w-[560px]">
      <p className="text-[48px] xl:text-[58px] font-black text-white leading-tight tracking-tight">
        {text}
        <span className="inline-block w-[3px] h-[52px] xl:h-[64px] ml-2 bg-success align-middle animate-pulse rounded-full" />
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('E-mail ou palavra-passe incorretos');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Erro ao obter utilizador'); setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();

    navigate(profile?.role === 'admin' ? '/dashboard' : '/meu-dashboard');
  }

  return (
    <div className="min-h-screen flex">

      {/* ══ PAINEL ESQUERDO — 50% ═══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex w-1/2 flex-col relative overflow-hidden"
        style={{ backgroundColor: '#0f2147' }}
      >
        {/* Padrão de pontos geométrico */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Imagem de fundo subtil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url("/RLS.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.07,
          }}
        />

        {/* Layout: topo → meio → baixo */}
        <div className="relative z-10 flex flex-col items-center justify-between h-full py-14 px-10">

          {/* TOPO — Logo com presença e tagline */}
          <div className="flex flex-col items-center gap-3">
            <RlsLogo height={130} />
            <div className="flex items-center gap-2 mt-1">
              <div className="h-px w-8 bg-white/20 rounded-full" />
              <p className="text-[10px] font-bold text-white/35 tracking-[0.4em] uppercase">
                Automação Industrial
              </p>
              <div className="h-px w-8 bg-white/20 rounded-full" />
            </div>
          </div>

          {/* CENTRO — Texto com efeito de digitação + subtexto */}
          <Typewriter />

          {/* BAIXO — Copyright */}
          <p className="text-[11px] text-white/35 font-medium text-center tracking-wide">
            © {new Date().getFullYear()} RLS Automação Industrial
          </p>
        </div>
      </div>

      {/* ══ PAINEL DIREITO — 50% ════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 bg-gray-bg">
        <div className="w-full max-w-[380px]">

          {/* Logo mobile — só visível em mobile */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <RlsLogo height={62} />
            <p className="mt-3 text-[10px] font-bold text-gray-muted tracking-[0.25em] uppercase">
              Automação Industrial
            </p>
          </div>

          {/* Card do formulário */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8">
            <div className="mb-7">
              <h2 className="text-[22px] font-black text-navy tracking-tight">Entrar</h2>
              <p className="text-[12px] text-gray-muted mt-1">Introduza as suas credenciais para aceder</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-muted">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/40 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-gray-muted">
                  Palavra-passe
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-border bg-gray-bg text-[13px] text-gray-text placeholder:text-gray-muted/40 focus:outline-none focus:ring-2 focus:ring-navy/10 focus:border-navy/25 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-error/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                  <p className="text-[12px] text-error font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-bold text-[13px] text-white tracking-wide transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#0f2147' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    A entrar...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-gray-muted font-semibold mt-6">
            © {new Date().getFullYear()} RLS Automação Industrial
          </p>
        </div>
      </div>
    </div>
  );
}
