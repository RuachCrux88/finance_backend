# 🚀 Guía de Configuración en Vercel - Paso a Paso

## ✅ Cambios ya implementados y subidos a GitHub

Los cambios necesarios ya están en el repositorio. Ahora necesitas configurar Vercel correctamente.

---

## 📋 Paso 1: Verificar el Despliegue en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto **finance-backend**
3. Ve a la pestaña **"Deployments"**
4. Verifica que el último deployment esté usando el commit más reciente (`e94c5c8`)
5. Si no está actualizado, haz click en **"Redeploy"** → **"Use existing Build Cache"** (opcional) → **"Redeploy"**

---

## 🔧 Paso 2: Configurar Variables de Entorno

### 2.1 Ir a Settings → Environment Variables

1. En tu proyecto de Vercel, ve a **Settings** → **Environment Variables**
2. Agrega las siguientes variables (una por una):

### Variables Obligatorias:

#### Base de Datos
```
Nombre: DATABASE_URL
Valor: postgresql://usuario:password@host:puerto/database?sslmode=require
Ambiente: Production, Preview, Development (marca todas)
```

```
Nombre: DIRECT_URL
Valor: postgresql://usuario:password@host:puerto/database?sslmode=require
Ambiente: Production, Preview, Development (marca todas)
```

#### JWT Secret
```
Nombre: JWT_SECRET
Valor: [genera un string aleatorio de al menos 32 caracteres]
Ambiente: Production, Preview, Development (marca todas)
```

#### Google OAuth
```
Nombre: GOOGLE_CLIENT_ID
Valor: [tu Google Client ID]
Ambiente: Production, Preview, Development (marca todas)
```

```
Nombre: GOOGLE_CLIENT_SECRET
Valor: [tu Google Client Secret]
Ambiente: Production, Preview, Development (marca todas)
```

#### URLs (CRÍTICO - Usa las URLs exactas de Vercel)
```
Nombre: FRONTEND_URL
Valor: https://financefrontend-pink.vercel.app
Ambiente: Production, Preview, Development (marca todas)
```

```
Nombre: API_BASE_URL
Valor: https://financebackend-ecru.vercel.app
Ambiente: Production, Preview, Development (marca todas)
```

```
Nombre: NEXT_PUBLIC_API_BASE_URL
Valor: https://financebackend-ecru.vercel.app
Ambiente: Production, Preview, Development (marca todas)
```

#### Variables de Vercel (Opcional pero recomendado)
```
Nombre: VERCEL
Valor: 1
Ambiente: Production, Preview, Development (marca todas)
```

```
Nombre: NODE_ENV
Valor: production
Ambiente: Production, Preview, Development (marca todas)
```

### 2.2 Verificar Variables

Después de agregar todas las variables, deberías ver algo como esto:

```
✅ DATABASE_URL
✅ DIRECT_URL
✅ JWT_SECRET
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ FRONTEND_URL
✅ API_BASE_URL
✅ NEXT_PUBLIC_API_BASE_URL
✅ VERCEL
✅ NODE_ENV
```

---

## 🔄 Paso 3: Re-desplegar el Proyecto

Después de agregar las variables de entorno:

1. Ve a la pestaña **"Deployments"**
2. Click en los **3 puntos** (⋯) del último deployment
3. Selecciona **"Redeploy"**
4. Espera a que termine el build (puede tardar 2-5 minutos)

---

## 🔐 Paso 4: Configurar Google OAuth

### 4.1 Ir a Google Cloud Console

1. Ve a https://console.cloud.google.com
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Click en tu **OAuth 2.0 Client ID** para editarlo

### 4.2 Agregar Redirect URI

En la sección **"Authorized redirect URIs"**, agrega:

```
https://financebackend-ecru.vercel.app/auth/google/callback
```

**Importante**: 
- Debe ser exactamente esta URL (con `https://`)
- No debe tener barra final (`/`)
- Debe coincidir exactamente con la URL de tu backend en Vercel

### 4.3 Guardar Cambios

Click en **"Save"** al final de la página.

---

## ✅ Paso 5: Verificar que Funciona

### 5.1 Probar el Endpoint de Google OAuth

1. Abre tu navegador
2. Ve a: `https://financebackend-ecru.vercel.app/auth/google`
3. Deberías ser redirigido a Google para autenticación
4. Después de autenticarte, deberías ser redirigido al frontend

### 5.2 Verificar Logs

Si hay algún error:

1. Ve a Vercel Dashboard → Tu proyecto → **"Deployments"**
2. Click en el último deployment
3. Ve a la pestaña **"Logs"**
4. Revisa los errores (si los hay)

---

## 🐛 Troubleshooting

### Error 404 en `/auth/google`

**Posibles causas:**
1. ❌ Variables de entorno no configuradas
2. ❌ El handler no se está exportando correctamente
3. ❌ El build falló

**Solución:**
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs del build en Vercel
3. Asegúrate de que el último commit esté desplegado

### Error de CORS

**Causa:** `FRONTEND_URL` no está configurada o es incorrecta

**Solución:**
- Verifica que `FRONTEND_URL` sea exactamente `https://financefrontend-pink.vercel.app` (sin barra final)

### Error de Google OAuth

**Causa:** El redirect URI en Google Console no coincide

**Solución:**
- Verifica que el redirect URI en Google Console sea exactamente:
  ```
  https://financebackend-ecru.vercel.app/auth/google/callback
  ```

### El build falla

**Causa:** Dependencias faltantes o error de compilación

**Solución:**
1. Revisa los logs del build
2. Verifica que `vercel-build` ejecute `npm run build && npx prisma generate`
3. Asegúrate de que todas las dependencias estén en `dependencies` (no solo `devDependencies`)

---

## 📝 Checklist Final

Antes de probar el login, verifica:

- [ ] Todas las variables de entorno están configuradas en Vercel
- [ ] El proyecto se re-desplegó después de agregar las variables
- [ ] El redirect URI está configurado en Google Console
- [ ] La URL del backend es: `https://financebackend-ecru.vercel.app`
- [ ] La URL del frontend es: `https://financefrontend-pink.vercel.app`
- [ ] El frontend tiene configurado `NEXT_PUBLIC_API_BASE_URL=https://financebackend-ecru.vercel.app`

---

## 🎯 Próximos Pasos

1. ✅ Configura las variables de entorno (Paso 2)
2. ✅ Re-despliega el proyecto (Paso 3)
3. ✅ Configura Google OAuth (Paso 4)
4. ✅ Prueba el login (Paso 5)

Si después de seguir estos pasos aún hay errores, revisa los logs en Vercel y compártelos para ayudarte a resolverlos.

