# 🔧 Configuración Completa de Vercel - Backend

## 📋 Variables de Entorno Requeridas

Configura estas variables en **Vercel → Settings → Environment Variables** para el proyecto **finance-backend**:

### Variables Obligatorias

```
DATABASE_URL = [tu URL de PostgreSQL completa]
DIRECT_URL = [tu URL directa de PostgreSQL]
JWT_SECRET = [un string aleatorio seguro, mínimo 32 caracteres]
GOOGLE_CLIENT_ID = [tu Google OAuth Client ID]
GOOGLE_CLIENT_SECRET = [tu Google OAuth Client Secret]
```

### Variables de URLs

```
FRONTEND_URL = https://financefrontend-pink.vercel.app
API_BASE_URL = https://financebackend-ecru.vercel.app
NEXT_PUBLIC_API_BASE_URL = https://financebackend-ecru.vercel.app
```

### Variables del Sistema

```
NODE_ENV = production
```

## ⚠️ Importante

- **Sin barra final (`/`)** en ninguna URL
- **Usa `https://`** (no `http://`)
- **Marca todas las variables** para Production, Preview y Development
- **Re-despliega** después de agregar/modificar variables

## 🔗 URLs de Referencia

- **Frontend en Vercel**: `https://financefrontend-pink.vercel.app`
- **Backend en Vercel**: `https://financebackend-ecru.vercel.app`
- **Google OAuth Callback**: `https://financebackend-ecru.vercel.app/auth/google/callback`

## ✅ Verificación

Después de configurar, prueba que el backend responde:

```bash
curl https://financebackend-ecru.vercel.app/auth/me
```

Debería devolver: `{"statusCode":401,"message":"Unauthorized"}` (esto es correcto, significa que el backend funciona)

