'use client';
import { useState, useEffect } from 'react';
import { admin, listings as listingsApi, getUser } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [tab, setTab] = useState('dashboard');
  const [dash, setDash] = useState<any>(null);
  const [pending, setPending] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [logs, setLogs] = useState<any>(null);
  const router = useRouter();
  const user = getUser();

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { router.push('/login'); return; }
    load();
  }, [tab]);

  const load = () => {
    if (tab === 'dashboard') admin.dashboard().then(setDash);
    if (tab === 'anuncios') admin.pendingListings().then(setPending);
    if (tab === 'usuarios') admin.users().then(setUsers);
    if (tab === 'logs') admin.logs().then(setLogs);
  };

  const moderate = async (id: string, status: string) => {
    const reason = status === 'REJECTED' ? prompt('Motivo del rechazo:') : undefined;
    await listingsApi.moderate(id, status, reason || undefined);
    load();
  };

  const ban = async (id: string) => {
    const reason = prompt('Motivo del ban:');
    if (!reason) return;
    await admin.ban(id, reason);
    load();
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/" className="text-muted text-sm hover:text-white mb-6 block">← Volver al marketplace</Link>
        <h1 className="text-xl font-bold mb-6">Panel de administración</h1>

        <div className="flex gap-0 border-b border-border mb-6">
          {['dashboard', 'anuncios', 'usuarios', 'logs'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-2.5 px-5 text-xs font-semibold capitalize transition border-b-2 ${tab === t ? 'border-gold text-gold' : 'border-transparent text-muted'}`}>{t}</button>
          ))}
        </div>

        {tab === 'dashboard' && dash && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: 'Usuarios', val: dash.users },
              { label: 'Anuncios activos', val: dash.listings },
              { label: 'Pendientes', val: dash.pending },
              { label: 'Reportes', val: dash.reports },
              { label: 'Ingresos mes', val: `${dash.monthlyEur}€` },
              { label: 'Ingresos total', val: `${dash.totalEur}€` },
              { label: 'Nuevos este mes', val: dash.newUsers },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                <div className="text-[10px] text-dim uppercase tracking-wider mb-1">{s.label}</div>
                <div className="text-xl font-bold">{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'anuncios' && (
          <div className="space-y-2">
            {pending?.items?.length === 0 && <p className="text-muted text-sm py-8 text-center">No hay anuncios pendientes</p>}
            {pending?.items?.map((l: any) => (
              <div key={l.id} className="bg-card rounded-xl border border-border p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="font-semibold text-sm">{l.title}</div>
                  <div className="text-xs text-muted mt-0.5">{l.profile?.alias} · {l.profile?.city?.name} · {l.category?.name}</div>
                  <p className="text-xs text-dim mt-1 line-clamp-2">{l.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moderate(l.id, 'APPROVED')} className="px-4 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-semibold">Aprobar</button>
                  <button onClick={() => moderate(l.id, 'REJECTED')} className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'usuarios' && (
          <div className="space-y-2">
            {users?.items?.map((u: any) => (
              <div key={u.id} className="bg-card rounded-xl border border-border p-4 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="text-sm font-semibold">{u.email}</div>
                  <div className="text-xs text-muted">{u.role} · {u.profile?.alias || 'Sin perfil'} · {u.profile?.city?.name || ''}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {u.banned ? 'Baneado' : 'Activo'}
                  </span>
                  {!u.banned && u.role !== 'ADMIN' && (
                    <button onClick={() => ban(u.id)} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-semibold">Ban</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-1">
            {logs?.items?.map((l: any) => (
              <div key={l.id} className="bg-card rounded-lg border border-border px-4 py-2 flex justify-between items-center text-xs">
                <div>
                  <span className="text-muted">{l.user?.email || 'Sistema'}</span>
                  <span className="text-gold mx-2">{l.action}</span>
                  <span className="text-dim">{l.entity} {l.entityId.slice(0, 8)}</span>
                </div>
                <span className="text-dim">{new Date(l.createdAt).toLocaleString('es')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
