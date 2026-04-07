'use client';
import { useState, useEffect } from 'react';
import { listings, profiles, getUser, favorites as favApi } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ListingDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('info');
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const user = getUser();

  useEffect(() => { listings.get(id as string).then(setData).catch(console.error); }, [id]);

  const requestContact = async () => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      const r = await profiles.contact(data.profile.id);
      setPhone(r.phone || 'No disponible');
      setShowPhone(true);
    } catch (e: any) { alert(e.message || 'Error'); }
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted">Cargando...</div>;
  const p = data.profile;
  const hue = (p.alias.charCodeAt(0) * 37 + (p.alias.charCodeAt(1) || 0) * 53) % 360;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-muted hover:text-white transition text-sm">← Volver</Link>
          <span className="text-sm font-semibold">{p.alias}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Image */}
          <div className="h-64 md:h-80 relative cursor-pointer" style={{ background: `linear-gradient(135deg, hsl(${hue},40%,15%), hsl(${(hue + 60) % 360},35%,20%))` }}>
            <div className="absolute inset-0 backdrop-blur-2xl flex items-center justify-center">
              <span className="text-7xl font-extralight text-white/25">{p.alias.slice(0, 2)}</span>
            </div>
            {p.promotions?.length > 0 && (
              <div className="absolute top-4 right-4 bg-black/60 text-gold text-[10px] font-semibold px-3 py-1 rounded-full uppercase">★ Premium</div>
            )}
          </div>

          <div className="p-5 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{p.alias}</h1>
                  {p.isOnline && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">En línea</span>}
                </div>
                <div className="flex gap-3 text-xs text-muted">
                  <span>{p.city?.name}</span>
                  <span>{p.availability || 'Flexible'}</span>
                  <span>{p.viewCount?.toLocaleString()} visitas</span>
                </div>
              </div>
              <span className="text-3xl font-bold text-gold">{p.pricePerHour}€<span className="text-xs font-normal text-dim">/h</span></span>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-border mb-5">
              {['info', 'servicios', 'contacto'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`pb-2.5 px-5 text-xs font-semibold capitalize transition border-b-2 ${tab === t ? 'border-gold text-gold' : 'border-transparent text-muted'}`}>{t}</button>
              ))}
            </div>

            {tab === 'info' && (
              <div>
                <p className="text-sm leading-relaxed text-white/80 mb-5">{data.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: 'Categoría', val: data.category?.name },
                    { label: 'Disponibilidad', val: p.availability || 'Flexible' },
                    { label: 'Idiomas', val: p.languages?.join(', ') || 'ES' },
                  ].map(s => (
                    <div key={s.label} className="bg-surface rounded-xl p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-1">{s.label}</div>
                      <div className="text-xs font-medium">{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'servicios' && (
              <div className="flex flex-wrap gap-2">
                {p.services?.map((s: any) => (
                  <span key={s.service.id} className="px-4 py-2 rounded-full bg-purple/20 text-purple-light text-xs font-medium">{s.service.name}</span>
                ))}
                {(!p.services || p.services.length === 0) && <p className="text-sm text-muted">No hay servicios especificados</p>}
              </div>
            )}

            {tab === 'contacto' && (
              <div>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={requestContact}
                    className={`flex-1 min-w-[180px] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${showPhone ? 'bg-surface border border-gold/30 text-gold' : 'bg-gradient-to-r from-gold to-gold-dark text-black'}`}>
                    {showPhone ? phone : 'Ver teléfono'}
                  </button>
                  <button className="flex-1 min-w-[180px] py-3 rounded-xl bg-surface border border-gold/30 text-gold font-semibold text-sm">
                    Enviar mensaje
                  </button>
                </div>
                <p className="text-[10px] text-dim mt-3 text-center">Contacto disponible tras verificación de edad</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
