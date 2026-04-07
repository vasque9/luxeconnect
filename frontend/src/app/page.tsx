'use client';
import { useState, useEffect } from 'react';
import { listings, getUser, favorites as favApi } from '@/lib/api';
import Link from 'next/link';

function StarIcon({ filled = true }: { filled?: boolean }) {
  return <svg width="13" height="13" viewBox="0 0 20 20" fill={filled ? '#c9a84c' : 'none'} stroke={filled ? '#c9a84c' : '#5c5a6e'} strokeWidth="1.5"><path d="M10 1l2.39 4.84L18 6.71l-4 3.9.94 5.5L10 13.38 5.06 16.1 6 10.6l-4-3.9 5.61-.87z" /></svg>;
}

function Card({ item, onFav, isFav }: any) {
  const p = item.profile;
  const promoted = p.promotions?.length > 0;
  const hue = (p.alias.charCodeAt(0) * 37 + (p.alias.charCodeAt(1) || 0) * 53) % 360;

  return (
    <Link href={`/listing/${item.id}`} className="block">
      <div className={`bg-card rounded-xl border overflow-hidden transition-all hover:-translate-y-1 hover:border-muted ${promoted ? 'border-gold/30' : 'border-border'}`}>
        <div className="relative h-48" style={{ background: `linear-gradient(135deg, hsl(${hue},40%,15%), hsl(${(hue + 60) % 360},35%,20%))` }}>
          <div className="absolute inset-0 backdrop-blur-xl flex items-center justify-center">
            <span className="text-5xl font-extralight text-white/30">{p.alias[0]}</span>
          </div>
          {promoted && (
            <div className="absolute top-2 right-2 bg-black/50 text-gold text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">★ Premium</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{p.alias}</span>
                {p.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </div>
              <div className="text-xs text-muted flex items-center gap-1 mt-0.5">{p.city?.name}</div>
            </div>
            <button onClick={(e) => { e.preventDefault(); onFav(p.id); }} className="text-muted hover:text-crimson transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isFav ? '#c43b5c' : 'none'} stroke={isFav ? '#c43b5c' : 'currentColor'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
            </button>
          </div>
          <p className="text-xs text-muted line-clamp-2 my-2">{item.description}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {p.services?.slice(0, 3).map((s: any) => (
              <span key={s.service.id} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted">{s.service.name}</span>
            ))}
          </div>
          <div className="flex justify-between items-center border-t border-border pt-2">
            <div className="flex items-center gap-1"><StarIcon /><span className="text-xs font-semibold text-gold-light">—</span></div>
            <span className="text-lg font-bold text-gold">{p.pricePerHour}€<span className="text-[10px] font-normal text-dim">/h</span></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('featured');
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const user = getUser();

  useEffect(() => {
    const params: any = {};
    if (search) params.q = search;
    if (category) params.category = category;
    params.sort = sort;
    listings.search(params).then(setData).catch(console.error);
  }, [search, category, sort]);

  const toggleFav = async (profileId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    await favApi.toggle(profileId);
    setFavs(prev => {
      const n = new Set(prev);
      n.has(profileId) ? n.delete(profileId) : n.add(profileId);
      return n;
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold bg-gradient-to-r from-gold to-crimson bg-clip-text text-transparent">Luxe</span>
            <span className="text-xl font-light">Connect</span>
          </Link>
          <div className="flex gap-2">
            {user ? (
              <>
                {user.role === 'PROVIDER' && <Link href="/dashboard" className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted hover:text-white transition">Mi perfil</Link>}
                {user.role === 'ADMIN' && <Link href="/admin" className="text-xs bg-gold/10 border border-gold/30 rounded-lg px-3 py-1.5 text-gold font-semibold">Admin</Link>}
              </>
            ) : (
              <Link href="/login" className="text-xs border border-border rounded-lg px-3 py-1.5 text-muted hover:text-white transition">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-surface to-bg py-10 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Encuentra compañía <span className="bg-gradient-to-r from-gold to-crimson bg-clip-text text-transparent">exclusiva</span></h1>
        <p className="text-muted text-sm mb-6">Perfiles verificados · Discreción garantizada · Servicio premium</p>
        <div className="max-w-xl mx-auto relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, servicio, ubicación..."
            className="w-full px-4 py-3 pl-10 rounded-xl border border-border bg-card text-white text-sm outline-none focus:border-gold/50 transition" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['', 'compania', 'masajes', 'eventos', 'viajes', 'premium'].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-xs transition ${category === c ? 'bg-gold text-black font-semibold' : 'bg-card border border-border text-muted hover:text-white'}`}>
              {c === '' ? 'Todo' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-muted">
          <option value="featured">Destacados</option>
          <option value="recent">Recientes</option>
          <option value="price_asc">Precio ↑</option>
          <option value="price_desc">Precio ↓</option>
        </select>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <p className="text-xs text-dim mb-4">{data?.total || 0} resultados</p>
        {data?.items?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((item: any) => (
              <Card key={item.id} item={item} onFav={toggleFav} isFav={favs.has(item.profile?.id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-dim">
            <p className="text-lg mb-1">No hay anuncios publicados</p>
            <p className="text-xs">Los proveedores pueden registrarse y crear su perfil</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <span className="text-sm font-semibold bg-gradient-to-r from-gold to-crimson bg-clip-text text-transparent">LuxeConnect</span>
        <p className="text-dim text-[10px] mt-2">Plataforma de servicios profesionales para adultos · +18</p>
      </footer>
    </div>
  );
}
