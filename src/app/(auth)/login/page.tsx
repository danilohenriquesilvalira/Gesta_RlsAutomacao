'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RlsLogo } from '@/components/shared/RlsLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('E-mail ou palavra-passe incorretos');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Erro ao obter utilizador');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/meu-dashboard');
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-bg px-4 overflow-hidden">

      {/* Imagem de Fundo com Transparência */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url("/RLS.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.4 // Ajuste aqui a transparência (0.1 = 10%, 1.0 = 100%)
        }}
      />

      {/* Card de Login - Adicionada a classe z-10 para ficar acima do fundo */}
      <Card className="relative z-10 w-full max-w-md shadow-lg border-gray-border bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6 pt-8">
          <div className="flex justify-center">
            <RlsLogo height={54} />
          </div>
          <p className="text-[11px] font-semibold text-gray-muted tracking-[0.18em] uppercase">
            Portal de Gestão
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-error font-medium">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-navy hover:bg-navy-light text-white"
              disabled={loading}
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}