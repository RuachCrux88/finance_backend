# Variables de Entorno para Vercel - Backend

## 🔧 Configuración Requerida en Vercel Dashboard

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

### Variables Obligatorias

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require
DIRECT_URL=postgresql://usuario:password@host:puerto/database?sslmode=require

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro_y_largo_minimo_32_caracteres

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# URLs (importante para OAuth y CORS)
FRONTEND_URL=https://financefrontend-pink.vercel.app
API_BASE_URL=https://financebackend-ecru.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://financebackend-ecru.vercel.app

# Vercel (automático, pero puedes agregarlo explícitamente)
VERCEL=1
NODE_ENV=production
```

### Notas Importantes

1. **API_BASE_URL**: Debe ser exactamente `https://financebackend-ecru.vercel.app` (sin barra final)
2. **FRONTEND_URL**: Debe ser exactamente `https://financefrontend-pink.vercel.app` (sin barra final)
3. **Google OAuth**: Asegúrate de que en Google Cloud Console, el redirect URI sea:
   ```
   https://financebackend-ecru.vercel.app/auth/google/callback
   ```

### Verificación

Después de configurar las variables:
1. Vuelve a desplegar el proyecto en Vercel
2. Verifica que el endpoint `/auth/google` funcione
3. Prueba el login con Google

