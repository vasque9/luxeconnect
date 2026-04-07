'use client';
import { useState, useEffect } from 'react';
import { profiles, payments, getUser, api, listings as listingsApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ alias: '', bio: '', cityId: '', pricePerHour: 100, availability: '', serviceIds: [] as string[] });
  const [listingForm, setListingForm] = useState({ title: '', description: '', categoryId: '' });
  const [error, setError] = useState('');
  const router = useRouter();
  const user = getUser();

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') { router.push('/login'); return; }
    loadProfile();
    payments.pricing().then(setPricing).catch(() => {});
    api.get('/api/reference/cities').then(r => setCities(r || [])).catch(() => {});
    api.get('/api/reference/services').then(r => setServices(r || [])).catch(() => {});
    api.get('/api/reference/categories').then(r => setCategories(r || [])).catch(() => {});
  }, []);

  const loadProfile = () => {
    profiles.me().then(p => { setProfile(p); setCreating(false); }).catch(() => setCreating(true));
    profiles.stats().then(setStats).catch(() => {});
  };

  const createProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await profiles.create({ ...form, pricePerHour: Number(form.pricePerHour) });
      loadProfile();
    } catch (err: any) { setError(err.message || 'Error'); }
  };

  const createListing = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const res = await listingsApi.create(listingForm);
      if (res.id) loadProfile();
      else setError(res.message || 'Error');
    } catch (err: any) { setError(err.message || 'Error'); }
  };

  const checkout = async (type: string) => {
    try {
      const r = await payments.checkout(type);
      if (r.sessionUrl) window.location.href = r.sessionUrl;
      else alert(r.message || 'Stripe no configurado');
    } catch { alert('Stripe no configurado en el servidor'); }
  };

  if (creating) return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-muted text-sm hover:text-white mb-6 block">← Volver</Link>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Crear tu perfil de proveedor</h2>
          {error && <p className="text-crimson text-xs mb-3 bg-crimson/10 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={createProfile} className="space-y-3">
            <input value={form.alias} onChange={e => setForm({ ...form, alias: e.target.value })} placeholder="Alias (nombre público)"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required />
            <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Descripción..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50 h-24 resize-none" />
            <select value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none" required>
              <option value="">Ciudad</option>
              {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" value={form.pricePerHour} onChange={e => setForm({ ...form, pricePerHour: +e.target.value })} placeholder="Precio/hora (€)" min="1"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required />
            <input value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} placeholder="Disponibilidad (ej: Lun-Sáb)"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" />
            <div>
              <p className="text-xs text-muted mb-2">Servicios:</p>
              <div className="flex flex-wrap gap-2">
                {services.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => {
                    setForm(f => ({ ...f, serviceIds: f.serviceIds.includes(s.id) ? f.serviceIds.filter(x => x !== s.id) : [...f.serviceIds, s.id] }));
                  }} className={`px-3 py-1 rounded-full text-xs transition ${form.serviceIds.includes(s.id) ? 'bg-gold text-black' : 'bg-surface border border-border text-muted'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-sm">Crear perfil</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-muted text-sm hover:text-white mb-6 block">← Volver al marketplace</Link>
        <h1 className="text-xl font-bold mb-6">Mi panel · {profile?.alias}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Visitas', val: stats?.views || 0 },
            { label: 'Contactos', val: stats?.contacts || 0 },
            { label: 'Valoración', val: stats?.avgRating || '—' },
            { label: 'Conversión', val: stats?.conversion || '0%' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-4">
              <div className="text-[10px] text-dim uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-xl font-bold">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Create listing if not exists */}
        {!profile?.listing && (
          <div className="bg-card rounded-2xl border border-gold/20 p-6 mb-6">
            <h3 className="font-semibold mb-3">Crear tu anuncio</h3>
            {error && <p className="text-crimson text-xs mb-3">{error}</p>}
            <form onSubmit={createListing} className="space-y-3">
              <input value={listingForm.title} onChange={e => setListingForm({ ...listingForm, title: e.target.value })} placeholder="Título del anuncio"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none" required />
              <textarea value={listingForm.description} onChange={e => setListingForm({ ...listingForm, description: e.target.value })} placeholder="Descripción completa..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none h-24 resize-none" required />
              <select value={listingForm.categoryId} onChange={e => setListingForm({ ...listingForm, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm" required>
                <option value="">Categoría</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-sm">Publicar (pendiente revisión)</button>
            </form>
          </div>
        )}

        {/* Listing status */}
        {profile?.listing && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm">{profile.listing.title}</h3>
                <p className="text-xs text-muted mt-1">Categoría: {profile.listing.category?.name}</p>
              </div>
              <span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                profile.listing.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                profile.listing.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>{profile.listing.status}</span>
            </div>
          </div>
        )}

        {/* Promotions */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold mb-4">Promocionar mi perfil</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {pricing.map((p: any) => (
              <div key={p.id} className="bg-surface rounded-xl border border-gold/10 p-4">
                <div className="text-xs font-semibold text-gold mb-1">{p.name}</div>
                <div className="text-lg font-bold mb-2">{(p.priceEur / 100).toFixed(2)}€<span className="text-[10px] text-dim font-normal">/{p.duration}d</span></div>
                <button onClick={() => checkout(p.type)}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black text-xs font-semibold">Activar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
