import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando base de datos...');

  const cats = [
    { name: 'Compañía', slug: 'compania', icon: '👤', order: 1 },
    { name: 'Masajes', slug: 'masajes', icon: '💆', order: 2 },
    { name: 'Eventos', slug: 'eventos', icon: '🎭', order: 3 },
    { name: 'Viajes', slug: 'viajes', icon: '✈️', order: 4 },
    { name: 'Premium', slug: 'premium', icon: '⭐', order: 5 },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const svcs = ['Cena', 'Viaje', 'Evento social', 'Conversación', 'Tour', 'Relax', 'Deporte', 'Cultura'];
  for (const name of svcs) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.service.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  const cities = [
    { name: 'Madrid', slug: 'madrid', region: 'Comunidad de Madrid' },
    { name: 'Barcelona', slug: 'barcelona', region: 'Cataluña' },
    { name: 'Valencia', slug: 'valencia', region: 'Comunidad Valenciana' },
    { name: 'Sevilla', slug: 'sevilla', region: 'Andalucía' },
    { name: 'Bilbao', slug: 'bilbao', region: 'País Vasco' },
    { name: 'Málaga', slug: 'malaga', region: 'Andalucía' },
    { name: 'Alicante', slug: 'alicante', region: 'Comunidad Valenciana' },
    { name: 'Zaragoza', slug: 'zaragoza', region: 'Aragón' },
    { name: 'Palma', slug: 'palma', region: 'Islas Baleares' },
    { name: 'Las Palmas', slug: 'las-palmas', region: 'Canarias' },
  ];
  for (const c of cities) {
    await prisma.city.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const pricing = [
    { type: 'FEATURED_HOME' as const, name: 'Destacado en portada', priceEur: 4999, duration: 7 },
    { type: 'TOP_SEARCH' as const, name: 'Posición superior', priceEur: 2999, duration: 7 },
    { type: 'HIGHLIGHTED' as const, name: 'Perfil resaltado', priceEur: 1999, duration: 7 },
  ];
  for (const p of pricing) {
    await prisma.promotionPricing.upsert({ where: { type: p.type }, update: {}, create: p });
  }

  const email = process.env.ADMIN_EMAIL || 'admin@luxeconnect.com';
  const pass = process.env.ADMIN_PASSWORD || 'Admin123!';
  const hash = await bcrypt.hash(pass, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { email, passwordHash: hash, role: 'ADMIN', emailVerified: true, ageVerified: true },
  });

  console.log('✅ Listo. Admin:', email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
