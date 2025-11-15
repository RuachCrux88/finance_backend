# Guía para Ver las Tablas en Neon

## 📋 Opciones para Ver las Tablas

### Opción 1: Usar Prisma Studio (Recomendado - Más Visual) 🎨

Prisma Studio es una interfaz visual que te permite ver y editar tus datos fácilmente.

```bash
npm run db:studio
```

Esto abrirá una ventana en tu navegador (normalmente en `http://localhost:5555`) donde podrás:
- ✅ Ver todas las tablas (`User`, `Account`, `Wallet`, etc.)
- ✅ Ver los datos en formato de tabla
- ✅ Ver las relaciones entre tablas
- ✅ Editar datos directamente (si es necesario)
- ✅ Filtrar y buscar datos

### Opción 2: Usar Scripts de Node.js 📊

Ejecuta estos comandos para ver información detallada:

```bash
# Ver todos los usuarios y sus cuentas OAuth
npm run db:check-users

# Ver estado completo de las tablas
npm run db:view-tables
```

### Opción 3: SQL Editor en Neon (Acceso Directo) 💻

1. **Accede a Neon Console:**
   - Ve a https://console.neon.tech/
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto

2. **Abre el SQL Editor:**
   - En el menú lateral, busca "SQL Editor" o "Query"
   - Haz clic para abrir el editor SQL

3. **Ejecuta estas consultas:**

#### Ver todos los usuarios:
```sql
SELECT 
  id,
  email,
  name,
  "createdAt",
  "emailVerifiedAt"
FROM "User"
ORDER BY "createdAt" DESC;
```

#### Ver todas las cuentas OAuth:
```sql
SELECT 
  id,
  "userId",
  provider,
  "providerAccountId",
  type,
  "access_token",
  "refresh_token",
  "expires_at"
FROM "Account"
ORDER BY id DESC;
```

#### Ver usuarios con sus cuentas OAuth (JOIN):
```sql
SELECT 
  u.id AS user_id,
  u.email,
  u.name,
  u."createdAt" AS user_created,
  a.provider,
  a."providerAccountId",
  a."expires_at"
FROM "User" u
LEFT JOIN "Account" a ON u.id = a."userId"
ORDER BY u."createdAt" DESC;
```

#### Verificar que NO existe el campo password:
```sql
-- Esta consulta debería dar error si el campo password no existe (lo cual es correcto)
SELECT password FROM "User" LIMIT 1;
-- Si da error, significa que el campo fue eliminado correctamente ✅
```

#### Contar usuarios y cuentas:
```sql
SELECT 
  (SELECT COUNT(*) FROM "User") AS total_usuarios,
  (SELECT COUNT(*) FROM "Account") AS total_cuentas_oauth,
  (SELECT COUNT(*) FROM "Account" WHERE provider = 'google') AS cuentas_google;
```

### Opción 4: Ver Estructura de las Tablas 📐

Para ver la estructura completa de una tabla (columnas, tipos, etc.):

```sql
-- Ver estructura de la tabla User
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'User'
ORDER BY ordinal_position;

-- Ver estructura de la tabla Account
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Account'
ORDER BY ordinal_position;
```

## 🔍 Verificación de Migraciones

Para verificar que las migraciones se aplicaron correctamente:

```bash
npx prisma migrate status
```

Esto mostrará qué migraciones están aplicadas y cuáles están pendientes.

## ⚠️ Problemas Comunes

### No veo los datos actualizados en Neon

1. **Verifica la conexión:**
   ```bash
   npm run db:check-users
   ```
   Si este comando funciona, la conexión está bien.

2. **Verifica que estás en el proyecto correcto:**
   - Asegúrate de estar viendo el proyecto correcto en Neon
   - Verifica que la `DATABASE_URL` en tu `.env` apunta al proyecto correcto

3. **Refresca la página:**
   - En el SQL Editor de Neon, a veces necesitas refrescar para ver los cambios

4. **Verifica el schema:**
   ```bash
   npx prisma db pull
   ```
   Esto sincronizará el schema con la base de datos real.

### Los usuarios no tienen cuentas OAuth

Si ves usuarios sin cuentas OAuth (como los usuarios 2 y 3 en el ejemplo), significa que:
- Fueron creados antes de implementar el sistema de `Account`
- O hubo un error durante el login

**Solución:** Cuando esos usuarios vuelvan a iniciar sesión con Google, el sistema automáticamente creará su cuenta OAuth.

## 📝 Notas Importantes

- Las tablas en PostgreSQL/Neon son **case-sensitive** (sensible a mayúsculas)
- Usa comillas dobles para nombres de tablas: `"User"`, `"Account"`
- El campo `password` fue eliminado correctamente ✅
- Los usuarios nuevos se guardan automáticamente cuando inician sesión con Google ✅

## 🚀 Comandos Útiles

```bash
# Ver usuarios
npm run db:check-users

# Ver tablas completas
npm run db:view-tables

# Abrir Prisma Studio (interfaz visual)
npm run db:studio

# Ver estado de migraciones
npx prisma migrate status

# Sincronizar schema con BD
npx prisma db pull

# Generar cliente Prisma
npx prisma generate
```

