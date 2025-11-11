# Guía de Despliegue - Backend

## Requisitos Previos

1. Base de datos PostgreSQL (Supabase, Neon, Railway, etc.)
2. Credenciales de Google OAuth
3. Servidor para desplegar (Railway, Render, Heroku, etc.)

## Variables de Entorno

Configura las siguientes variables de entorno:

```
DATABASE_URL=tu_url_de_postgresql
DIRECT_URL=tu_url_directa_de_postgresql
JWT_SECRET=tu_secreto_jwt_muy_seguro_y_largo
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=production
```

## Ejecutar Migraciones

```bash
npx prisma migrate deploy
```

## Seed de Base de Datos (Opcional)

```bash
npm run db:seed
```

## Configurar Google OAuth

1. Ve a Google Cloud Console
2. Edita las credenciales OAuth 2.0
3. Agrega a "Authorized redirect URIs":
   ```
   http://tu-backend.com/auth/google/callback
   ```

## Ejecutar en Producción

```bash
npm run build
npm run start:prod
```
