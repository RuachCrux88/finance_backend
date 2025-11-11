# Guía de Despliegue - Backend

## Despliegue en Vercel

### 1. Preparación

1. Asegúrate de que el código esté en GitHub
2. El archivo `vercel.json` ya está configurado
3. El script `vercel-build` está en `package.json`

### 2. Crear Proyecto en Vercel

1. Ve a https://vercel.com e inicia sesión con GitHub
2. Click en "Add New Project"
3. Selecciona el repositorio `finance_backend`
4. Configuración:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (por defecto)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Variables de Entorno

En la sección "Environment Variables" de Vercel, agrega:

```
DATABASE_URL=tu_url_de_postgresql
DIRECT_URL=tu_url_directa_de_postgresql
JWT_SECRET=tu_secreto_jwt_muy_seguro_y_largo
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FRONTEND_URL=https://tu-frontend.vercel.app
PORT=4000
NODE_ENV=production
```

### 4. Base de Datos

**Opción A: Vercel Postgres (Recomendado)**
1. En el proyecto de Vercel, ve a "Storage"
2. Click en "Create Database" → "Postgres"
3. Copia las URLs de conexión:
   - `DATABASE_URL` (con pooling)
   - `DIRECT_URL` (sin pooling, para migraciones)

**Opción B: Supabase**
1. Crea una cuenta en https://supabase.com
2. Crea un nuevo proyecto
3. Ve a Settings → Database
4. Copia la "Connection string" (URI)
5. Usa la misma URL para `DATABASE_URL` y `DIRECT_URL`

**Opción C: Neon**
1. Crea una cuenta en https://neon.tech
2. Crea un nuevo proyecto
3. Copia la connection string

### 5. Ejecutar Migraciones

Después del primer despliegue, ejecuta las migraciones:

```bash
# Opción 1: Desde tu máquina local
cd finance-backend
npx prisma migrate deploy

# Opción 2: Usando Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy
```

### 6. Seed de Base de Datos (Opcional)

Si necesitas datos iniciales:

```bash
npm run db:seed
```

### 7. Configurar Google OAuth

1. Ve a Google Cloud Console
2. Edita las credenciales OAuth 2.0
3. Agrega a "Authorized redirect URIs":
   ```
   https://tu-backend.vercel.app/auth/google/callback
   ```

### 8. Verificar Despliegue

1. Visita `https://tu-backend.vercel.app`
2. Deberías ver una respuesta (o error 404, que es normal si no hay ruta raíz)
3. Prueba: `https://tu-backend.vercel.app/auth/me` (debe requerir autenticación)

## Notas Importantes

- El puerto se configura automáticamente en Vercel (no necesitas especificarlo)
- Las variables de entorno se pueden configurar por ambiente (Production, Preview, Development)
- Después de cada despliegue, Vercel ejecutará `vercel-build` automáticamente
- Si cambias el schema de Prisma, recuerda ejecutar las migraciones

## Troubleshooting

**Error: "Cannot find module"**
- Verifica que `vercel-build` ejecute `npx prisma generate`
- Asegúrate de que todas las dependencias estén en `dependencies` (no solo `devDependencies`)

**Error de conexión a base de datos**
- Verifica que `DATABASE_URL` y `DIRECT_URL` estén correctamente configuradas
- Asegúrate de que la base de datos permita conexiones desde Vercel

**Error de CORS**
- Verifica que `FRONTEND_URL` esté configurada correctamente
- Asegúrate de que la URL del frontend coincida exactamente (incluyendo https/http)

