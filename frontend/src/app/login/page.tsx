'use client';
import { useState } from 'react';
import { auth, setTokens } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await auth.login(email, password);
      if (data.accessToken) { setTokens(data.accessToken, data.refreshToken); router.push('/'); }
      else setError(data.message || 'Error de autenticación');
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-1 mb-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-gold to-crimson bg-clip-text text-transparent">Luxe</span>
          <span className="text-2xl font-light text-white">Connect</span>
        </Link>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Iniciar sesión</h2>
          {error && <p className="text-crimson text-xs mb-3 bg-crimson/10 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={submit} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="text-xs text-muted mt-4 text-center">
            ¿No tienes cuenta? <Link href="/register" className="text-gold hover:underline">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
