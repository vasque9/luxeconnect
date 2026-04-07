'use client';
import { useState, useEffect } from 'react';
import { profiles, payments, getUser, api, listings as listingsApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'loading' | 'create-profile' | 'create-listing' | 'dashboard';

export default function Dashboard() {
  const [step, setStep] = useState<Step>('loading');
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ alias: '', bio: '', cityId: '', pricePerHour: 100, availability: '', languages: ['ES'], serviceIds: [] as string[] });
  const [listingForm, setListingForm] = useState({ title: '', description: '', categoryId: '' });
  const router = useRouter();
  const user = getUser();

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') { router.push('/login'); return; }
    api.get('/api/reference/cities').then(r => setCities(Array.isArray(r) ? r : [])).catch(() => {});
    api.get('/api/reference/services').then(r => setServices(Array.isArray(r) ? r : [])).catch(() => {});
    api.get('/api/reference/categories').then(r => setCategories(Array.isArray(r) ? r : [])).catch(() => {});
    payments.pricing().then(r => setPricing(Array.isArray(r) ? r : [])).catch(() => {});
    loadProfile();
  }, []);

  const loadProfile = () => {
    profiles.me().then(p => {
      setProfile(p);
      profiles.stats().then(setStats).catch(() => {});
      setStep(p.listing ? 'dashboard' : 'create-listing');
    }).catch(() => setStep('create-profile'));
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await profiles.create({ ...profileForm, pricePerHour: Number(profileForm.pricePerHour) });
      if (res?.id || res?.alias) {
        setProfile(res); setSuccess('Perfil creado correctamente');
        setTimeout(() => { setSuccess(''); setStep('create-listing'); }, 1500);
      } else setError(res?.message || 'Error al crear el perfil');
    } catch (err: any) { setError(err?.message || 'Error de conexión'); }
    setLoading(false);
  };

  const submitListing = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await listingsApi.create(listingForm);
      if (res?.id) {
        setSuccess('Anuncio enviado a revisión');
        setTimeout(() => { setSuccess(''); loadProfile(); }, 1500);
      } else setError(res?.message || 'Error al crear el anuncio');
    } catch (err: any) { setError(err?.message || 'Error de conexión'); }
    setLoading(false);
  };

  const checkout = async (type: string) => {
    try {
      const r = await payments.checkout(type);
      if (r.sessionUrl) window.location.href = r.sessionUrl;
      else alert(r.message || 'Stripe no configurado');
    } catch { alert('Stripe no configurado en el servidor'); }
  };

  const Stepper = () => {
    const steps = [{ key: 'create-profile', label: 'Perfil', num: 1 }, { key: 'create-listing', label: 'Anuncio', num: 2 }, { key: 'dashboard', label: 'Panel', num: 3 }];
    const idx = steps.findIndex(s => s.key === step);
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < idx ? 'bg-green-500/20 text-green-400 border border-green-500/30' : i === idx ? 'bg-gold text-black' : 'bg-surface border border-border text-dim'}`}>
              {i < idx ? '✓' : s.num}
            </div>
            <span className={`text-xs hidden sm:inline ${i === idx ? 'text-gold font-semibold' : 'text-dim'}`}>{s.label}</span>
            {i < steps.length - 1 && <div className={`w-8 h-px ${i < idx ? 'bg-green-500/30' : 'bg-border'}`} />}
          </div>
        ))}
      </div>
    );
  };

  if (step === 'loading') return <div className="min-h-screen bg-bg flex items-center justify-center"><div className="text-muted text-sm">Cargando...</div></div>;

  if (step === 'create-profile') return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-muted text-sm hover:text-white mb-4 block">← Volver</Link>
        <Stepper />
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold">Paso 1: Crea tu perfil</h2><p className="text-xs text-muted mt-1">Esta información se mostrará en tu anuncio</p></div>
          {error && <p className="text-crimson text-xs mb-3 bg-crimson/10 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-green-400 text-xs mb-3 bg-green-500/10 rounded-lg px-3 py-2">{success}</p>}
          <form onSubmit={submitProfile} className="space-y-3">
            <div><label className="text-xs text-muted mb-1 block">Alias (nombre público) *</label><input value={profileForm.alias} onChange={e => setProfileForm({...profileForm, alias: e.target.value})} placeholder="Ej: Valentina" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required /></div>
            <div><label className="text-xs text-muted mb-1 block">Descripción</label><textarea value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} placeholder="Describe tu perfil profesional..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50 h-28 resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted mb-1 block">Ciudad *</label><select value={profileForm.cityId} onChange={e => setProfileForm({...profileForm, cityId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none" required><option value="">Seleccionar</option>{cities.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="text-xs text-muted mb-1 block">Precio/hora (€) *</label><input type="number" value={profileForm.pricePerHour} onChange={e => setProfileForm({...profileForm, pricePerHour: +e.target.value})} min="1" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required /></div>
            </div>
            <div><label className="text-xs text-muted mb-1 block">Disponibilidad</label><input value={profileForm.availability} onChange={e => setProfileForm({...profileForm, availability: e.target.value})} placeholder="Ej: Lun-Sáb, 10:00-22:00" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" /></div>
            <div><label className="text-xs text-muted mb-2 block">Servicios</label><div className="flex flex-wrap gap-2">{services.map((s:any)=>(<button key={s.id} type="button" onClick={()=>setProfileForm(f=>({...f, serviceIds: f.serviceIds.includes(s.id)?f.serviceIds.filter(x=>x!==s.id):[...f.serviceIds,s.id]}))} className={`px-3 py-1.5 rounded-full text-xs transition ${profileForm.serviceIds.includes(s.id)?'bg-gold text-black font-semibold':'bg-surface border border-border text-muted hover:text-white'}`}>{s.name}</button>))}{services.length===0&&<span className="text-xs text-dim">Cargando...</span>}</div></div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition mt-2">{loading?'Creando perfil...':'Crear perfil y continuar →'}</button>
          </form>
        </div>
      </div>
    </div>
  );

  if (step === 'create-listing') return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-muted text-sm hover:text-white mb-4 block">← Volver</Link>
        <Stepper />
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="mb-5"><h2 className="text-lg font-semibold">Paso 2: Publica tu anuncio</h2><p className="text-xs text-muted mt-1">Será revisado antes de publicarse</p></div>
          {profile && <div className="bg-surface rounded-xl p-3 mb-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-sm">{profile.alias?.[0]}</div><div><div className="text-sm font-semibold">{profile.alias}</div><div className="text-[10px] text-muted">{profile.city?.name} · {profile.pricePerHour}€/h</div></div><span className="ml-auto text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Perfil creado</span></div>}
          {error && <p className="text-crimson text-xs mb-3 bg-crimson/10 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-green-400 text-xs mb-3 bg-green-500/10 rounded-lg px-3 py-2">{success}</p>}
          <form onSubmit={submitListing} className="space-y-3">
            <div><label className="text-xs text-muted mb-1 block">Título del anuncio *</label><input value={listingForm.title} onChange={e => setListingForm({...listingForm, title: e.target.value})} placeholder="Ej: Compañía exclusiva para eventos en Madrid" className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50" required /></div>
            <div><label className="text-xs text-muted mb-1 block">Descripción completa *</label><textarea value={listingForm.description} onChange={e => setListingForm({...listingForm, description: e.target.value})} placeholder="Describe en detalle tus servicios..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none focus:border-gold/50 h-32 resize-none" required /></div>
            <div><label className="text-xs text-muted mb-1 block">Categoría *</label><select value={listingForm.categoryId} onChange={e => setListingForm({...listingForm, categoryId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-white text-sm outline-none" required><option value="">Seleccionar categoría</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="bg-surface rounded-xl p-3"><p className="text-[10px] text-muted">⏳ Tu anuncio será revisado por nuestro equipo antes de publicarse. Menos de 24h.</p></div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition">{loading?'Enviando...':'Enviar anuncio a revisión →'}</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-muted text-sm hover:text-white">← Volver al marketplace</Link>
          <button onClick={()=>profiles.toggleOnline().then(r=>setProfile((p:any)=>({...p,isOnline:r.isOnline})))} className={`text-xs px-3 py-1.5 rounded-full border transition ${profile?.isOnline?'border-green-500/30 bg-green-500/10 text-green-400':'border-border bg-surface text-muted'}`}>{profile?.isOnline?'● En línea':'○ Desconectado'}</button>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">{profile?.alias?.[0]}</div>
          <div><h1 className="text-xl font-bold">{profile?.alias}</h1><div className="text-xs text-muted">{profile?.city?.name} · {profile?.pricePerHour}€/h · {profile?.availability||'Flexible'}</div></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[{label:'Visitas',val:stats?.views||0},{label:'Contactos',val:stats?.contacts||0},{label:'Valoración',val:stats?.avgRating||'—'},{label:'Conversión',val:stats?.conversion||'0%'}].map(s=>(
            <div key={s.label} className="bg-card rounded-xl border border-border p-4"><div className="text-[10px] text-dim uppercase tracking-wider mb-1">{s.label}</div><div className="text-xl font-bold">{s.val}</div></div>
          ))}
        </div>
        {profile?.listing&&(<div className="bg-card rounded-xl border border-border p-4 mb-6"><div className="flex justify-between items-center"><div><h3 className="font-semibold text-sm">{profile.listing.title}</h3><p className="text-xs text-muted mt-1">Categoría: {profile.listing.category?.name}</p></div><span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${profile.listing.status==='APPROVED'?'bg-green-500/20 text-green-400':profile.listing.status==='PENDING'?'bg-yellow-500/20 text-yellow-400':'bg-red-500/20 text-red-400'}`}>{profile.listing.status==='APPROVED'?'Publicado':profile.listing.status==='PENDING'?'En revisión':'Rechazado'}</span></div>{profile.listing.status==='PENDING'&&<p className="text-[10px] text-muted mt-2">⏳ En revisión por nuestro equipo</p>}{profile.listing.status==='REJECTED'&&profile.listing.rejectReason&&<p className="text-[10px] text-crimson mt-2">Motivo: {profile.listing.rejectReason}</p>}</div>)}
        {profile?.listing?.status==='APPROVED'&&pricing.length>0&&(<div className="bg-card rounded-2xl border border-border p-6 mb-6"><h3 className="font-semibold mb-4">Promocionar mi perfil</h3><div className="grid md:grid-cols-3 gap-3">{pricing.map((p:any)=>(<div key={p.id} className="bg-surface rounded-xl border border-gold/10 p-4"><div className="text-xs font-semibold text-gold mb-1">{p.name}</div><div className="text-lg font-bold mb-2">{(p.priceEur/100).toFixed(2)}€<span className="text-[10px] text-dim font-normal">/{p.duration}d</span></div><button onClick={()=>checkout(p.type)} className="w-full py-2 rounded-lg bg-gradient-to-r from-gold to-gold-dark text-black text-xs font-semibold hover:opacity-90 transition">Activar</button></div>))}</div></div>)}
        {profile?.promotions?.length>0&&(<div className="bg-card rounded-xl border border-border p-4 mb-6"><h3 className="font-semibold text-sm mb-2">Promociones activas</h3>{profile.promotions.map((p:any)=>(<div key={p.id} className="flex justify-between items-center text-xs py-1"><span className="text-gold">{p.type.replace(/_/g,' ')}</span><span className="text-dim">Expira: {new Date(p.endsAt).toLocaleDateString('es')}</span></div>))}</div>)}
        <div className="bg-card rounded-2xl border border-border p-6"><h3 className="font-semibold mb-3">Mi perfil</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">{[{label:'Alias',val:profile?.alias},{label:'Ciudad',val:profile?.city?.name},{label:'Precio',val:`${profile?.pricePerHour}€/h`},{label:'Disponibilidad',val:profile?.availability||'Flexible'},{label:'Idiomas',val:profile?.languages?.join(', ')||'ES'}].map(s=>(<div key={s.label} className="bg-surface rounded-xl p-3"><div className="text-[10px] text-dim uppercase tracking-wider mb-1">{s.label}</div><div className="text-xs font-medium">{s.val}</div></div>))}</div>{profile?.services?.length>0&&<div><div className="text-[10px] text-dim uppercase tracking-wider mb-2">Servicios</div><div className="flex flex-wrap gap-1.5">{profile.services.map((s:any)=>(<span key={s.service.id} className="px-3 py-1 rounded-full bg-purple/20 text-purple-light text-[11px]">{s.service.name}</span>))}</div></div>}</div>
      </div>
    </div>
  );
}
