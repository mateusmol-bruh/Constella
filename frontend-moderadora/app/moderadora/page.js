'use client';
import { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import Brand from '@/components/Brand';
import { loginModeradora } from '@/lib/api';
import { useSession } from '@/components/SessionProvider';
import { GradientButton, Notice } from '@/components/Panel';
import AstroLoader from '@/components/AstroLoader';
export default function Login() {
  const { session, ready, save, error: sessionError, retry } = useSession();
  const [email, setEmail] = useState(''),
    [senha, setSenha] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await loginModeradora(email, senha);
      if (!r.moderadora || !r.csrf) throw new Error('Resposta de autenticação inválida.');
      save(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSenha('');
    }
  }
  if (!ready || session) return <AstroLoader variant="fullscreen" label="Verificando sessão…" />;
  return (
    <main className="screen login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <Brand />
        <h1 id="login-title">Painel de moderação</h1>
        <p className="login-subtitle">Entre com sua conta de moderadora.</p>
        <form onSubmit={submit}>
          <label className="input-icon">
            <Mail size={22} />
            <input
              aria-label="E-mail"
              type="email"
              autoComplete="username"
              maxLength={255}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail da moderadora"
            />
          </label>
          <label className="input-icon">
            <LockKeyhole size={22} />
            <input
              aria-label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
            />
          </label>
          <Notice message={error || sessionError} />
          <GradientButton type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </GradientButton>
        </form>
        {sessionError && (
          <button type="button" className="retry-button" onClick={retry}>
            Verificar conexão e sessão
          </button>
        )}
      </section>
    </main>
  );
}
