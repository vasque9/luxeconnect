# LuxeConnect — Deploy directo sin desarrollo local

## Opción A: Deploy en Railway (backend) + Vercel (frontend)

### 1. Backend → Railway
1. Sube la carpeta `backend/` a un repo en GitHub
2. Ve a https://railway.app → New Project → Deploy from GitHub
3. Añade un servicio PostgreSQL (botón "Add Service" → Database → PostgreSQL)
4. En el servicio del backend, configura estas variables de entorno:
   - `DATABASE_URL` → la genera Railway automáticamente al vincular PostgreSQL
   - `JWT_SECRET` → pon una cadena larga aleatoria (mínimo 32 caracteres)
   - `FRONTEND_URL` → la URL que te dé Vercel después (puedes editarla luego)
   - `STRIPE_SECRET_KEY` → tu clave de Stripe (sk_test_... o sk_live_...)
   - `STRIPE_WEBHOOK_SECRET` → lo configuras después en Stripe Dashboard
   - `ADMIN_EMAIL` → email del admin (default: admin@luxeconnect.com)
   - `ADMIN_PASSWORD` → password del admin (default: Admin123!)
5. Railway detecta el Dockerfile y despliega automáticamente
6. La primera vez ejecutará las migraciones y el seed automáticamente

### 2. Frontend → Vercel
1. Sube la carpeta `frontend/` a otro repo (o monorepo)
2. Ve a https://vercel.com → New Project → importa el repo
3. Root directory: `frontend` (si es monorepo) o `/` si es repo separado
4. Framework Preset: Next.js (lo detecta solo)
5. Variables de entorno:
   - `NEXT_PUBLIC_API_URL` → la URL de tu backend en Railway (ej: https://luxeconnect-backend-production.up.railway.app)
6. Deploy

### 3. Configurar Stripe Webhooks
1. Ve a https://dashboard.stripe.com/webhooks
2. Añade endpoint: `https://TU-BACKEND.railway.app/api/payments/webhook`
3. Eventos: `checkout.session.completed`
4. Copia el signing secret → ponlo en `STRIPE_WEBHOOK_SECRET` en Railway

## Opción B: Todo en Railway
Puedes desplegar ambos en Railway. El frontend también funciona como servicio Node.

## Opción C: VPS (DigitalOcean, Hetzner, etc.)
```bash
git clone TU-REPO
cd luxeconnect
docker compose -f docker-compose.prod.yml up -d
```

## Credenciales por defecto
- Admin: admin@luxeconnect.com / Admin123!
- Cámbialas con las variables ADMIN_EMAIL y ADMIN_PASSWORD

## Endpoints API
Swagger UI: https://TU-BACKEND/api/docs
