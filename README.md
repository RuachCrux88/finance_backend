# 💰 Finance Backend API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
  <a href="https://github.com/RuachCrux88/finance_backend" target="_blank"><img src="https://img.shields.io/github/stars/RuachCrux88/finance_backend?style=social" alt="GitHub Stars" /></a>
</p>

## 📋 Descripción

API REST desarrollada con NestJS para la gestión financiera personal y grupal. Permite gestionar billeteras, transacciones, metas financieras, recordatorios de pagos y más.

**URL de producción:** [financebackend-ecru.vercel.app](https://financebackend-ecru.vercel.app)

## 🚀 Características

- 🔐 **Autenticación con Google OAuth** - Login seguro con Google
- 💼 **Billeteras personales y grupales** - Gestión de múltiples billeteras
- 💰 **Transacciones con división de gastos** - Splits automáticos entre miembros
- 🎯 **Metas financieras** - Seguimiento de progreso con actualización automática
- ⏰ **Recordatorios de pagos** - Notificaciones y renovación automática
- ✉️ **Sistema de invitaciones** - Invitaciones por email a billeteras grupales
- 📊 **Cálculo de balances** - Algoritmo de liquidaciones mínimas
- 📁 **Categorías personalizables** - Sistema de categorías globales y por billetera

## 🛠️ Stack Tecnológico

### Core
- **Node.js** 22.x
- **TypeScript** 5.7.3
- **NestJS** 11.0.1
- **Prisma** 6.19.0
- **PostgreSQL** (Supabase)

### Principales Dependencias
- `@nestjs/jwt` - Autenticación JWT
- `@nestjs/passport` - Estrategias de autenticación
- `passport-google-oauth20` - OAuth con Google
- `passport-jwt` - Validación de tokens
- `class-validator` - Validación de DTOs
- `class-transformer` - Transformación de objetos
- `nodemailer` - Envío de emails
- `@prisma/client` - ORM para base de datos

## 📁 Estructura del Proyecto

```
src/
├── app.module.ts              # Módulo raíz
├── main.ts                    # Punto de entrada
├── auth/                      # Autenticación
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── google.strategy.ts
│   ├── jwt.strategy.ts
│   └── jwt.guard.ts
├── users/                     # Gestión de usuarios
├── wallets/                   # Billeteras
├── transactions/              # Transacciones
├── categories/                # Categorías
├── goals/                     # Metas financieras
├── invitations/               # Sistema de invitaciones
├── reminders/                 # Recordatorios de pagos
├── prisma/                    # Servicio de base de datos
└── mailer/                    # Servicio de emails
```

## 🗄️ Base de Datos

### Modelos Principales
- `User` - Usuarios del sistema
- `Wallet` - Billeteras (PERSONAL/GROUP)
- `Transaction` - Transacciones (INCOME/EXPENSE/SETTLEMENT)
- `TransactionSplit` - División de gastos
- `Category` - Categorías de transacciones
- `Goal` - Metas financieras
- `GoalProgress` - Historial de progreso
- `Invitation` - Invitaciones a billeteras
- `PaymentReminder` - Recordatorios de pagos
- `Settlement` - Liquidaciones de deudas
- `WalletMember` - Miembros de billeteras grupales

### Migraciones
Las migraciones se encuentran en `prisma/migrations/` y se ejecutan con:
```bash
npx prisma migrate deploy
```

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 20+
- PostgreSQL (o cuenta en Supabase)
- Cuenta de Google Cloud para OAuth

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/RuachCrux88/finance_backend.git
cd finance_backend

# Instalar dependencias
npm install

# Generar cliente de Prisma
npm run prisma:generate
```

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:puerto/database
DIRECT_URL=postgresql://usuario:password@host:puerto/database

# JWT
JWT_SECRET=tu_secreto_jwt_muy_seguro_y_largo

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret

# Frontend
FRONTEND_URL=http://localhost:3000

# SMTP (para emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
MAIL_FROM=no-reply@finance.local

# Puerto del servidor
PORT=4000
NODE_ENV=development
```

### Configurar Base de Datos

```bash
# Ejecutar migraciones
npx prisma migrate deploy

# (Opcional) Poblar con datos iniciales
npm run db:seed
```

## 🏃 Ejecución

### Desarrollo
```bash
# Modo desarrollo con watch
npm run start:dev

# Modo desarrollo normal
npm run start
```

### Producción
```bash
# Compilar
npm run build

# Ejecutar
npm run start:prod
```

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run start              # Iniciar servidor
npm run start:dev          # Modo desarrollo (watch)
npm run start:debug        # Modo debug

# Producción
npm run build              # Compilar proyecto
npm run start:prod         # Ejecutar en producción

# Base de datos
npm run db:push            # Sincronizar esquema Prisma
npm run db:seed            # Poblar base de datos
npm run db:studio          # Abrir Prisma Studio
npm run prisma:generate    # Generar cliente Prisma

# Utilidades
npm run lint               # Linter
npm run format             # Formatear código
npm run test               # Tests unitarios
npm run test:e2e           # Tests end-to-end
npm run test:cov           # Coverage de tests
```

## 🌐 Despliegue

### Render (Producción)

El backend está desplegado en **Render**.

#### Configuración en Render:

1. **Crear Web Service**
   - Conectar repositorio de GitHub
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

2. **Variables de Entorno** (configurar en Render):
   - `DATABASE_URL` - Connection string de Supabase (pooling)
   - `DIRECT_URL` - Connection string directa de Supabase
   - `JWT_SECRET` - Secreto para JWT
   - `GOOGLE_CLIENT_ID` - ID de cliente Google OAuth
   - `GOOGLE_CLIENT_SECRET` - Secreto de cliente Google OAuth
   - `FRONTEND_URL` - URL del frontend (Vercel)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Configuración SMTP
   - `NODE_ENV=production`
   - `PORT=10000` (o el puerto asignado por Render)

3. **Ejecutar Migraciones**:
   ```bash
   npx prisma migrate deploy
   ```

#### Notas Importantes:
- Render puede tardar en iniciar en el plan gratuito (spin down después de inactividad)
- El primer request puede ser lento (cold start)
- Health check endpoint: `/health`

### Vercel (Alternativa)

El proyecto también puede desplegarse en Vercel usando el archivo `vercel.json` incluido.

## 🔐 Autenticación

### Flujo de Autenticación

1. Usuario hace clic en "Iniciar sesión con Google"
2. Redirección a Google OAuth
3. Google redirige a `/auth/google/callback`
4. `GoogleStrategy` valida el token
5. `AuthService.loginGoogle()`:
   - Busca o crea usuario
   - Crea cuenta de Google OAuth
   - Crea billetera personal por defecto
   - Genera JWT token
6. Token JWT se envía al frontend
7. Frontend almacena token y lo envía en headers

### Configurar Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita Google+ API
4. Crea credenciales OAuth 2.0
5. Configura Authorized redirect URIs:
   ```
   https://tu-backend.onrender.com/auth/google/callback
   ```
6. Configura Authorized JavaScript origins:
   ```
   https://tu-backend.onrender.com
   https://tu-frontend.vercel.app
   ```

## 📡 Endpoints Principales

### Autenticación
- `POST /auth/google` - Iniciar sesión con Google
- `GET /auth/me` - Obtener usuario actual

### Usuarios
- `GET /users` - Listar usuarios
- `DELETE /users/:id` - Eliminar usuario

### Billeteras
- `POST /wallets` - Crear billetera
- `GET /wallets` - Listar mis billeteras
- `GET /wallets/:id` - Obtener billetera
- `POST /wallets/join` - Unirse a billetera por código
- `GET /wallets/:id/balances` - Calcular balances
- `GET /wallets/:id/settlements/suggest` - Sugerir liquidaciones
- `POST /wallets/:id/settlements` - Crear liquidación

### Transacciones
- `POST /transactions` - Crear transacción
- `GET /transactions/wallet/:walletId` - Listar transacciones de billetera
- `GET /transactions/history` - Historial personal
- `GET /transactions/expenses` - Gastos agrupados

### Categorías
- `GET /categories` - Listar categorías
- `POST /categories` - Crear categoría
- `PUT /categories/:id` - Actualizar categoría
- `DELETE /categories/:id` - Eliminar categoría

### Metas
- `POST /goals` - Crear meta
- `GET /goals/user` - Metas del usuario
- `GET /goals/wallet/:walletId` - Metas de billetera
- `PUT /goals/:id` - Actualizar meta
- `POST /goals/:id/progress` - Actualizar progreso
- `DELETE /goals/:id` - Eliminar meta

### Invitaciones
- `POST /invitations` - Crear invitación
- `POST /invitations/accept` - Aceptar invitación
- `GET /invitations/pending` - Invitaciones pendientes

### Recordatorios
- `POST /reminders` - Crear recordatorio
- `GET /reminders` - Listar recordatorios
- `PUT /reminders/:id` - Actualizar recordatorio
- `POST /reminders/:id/mark-paid` - Marcar como pagado
- `DELETE /reminders/:id` - Eliminar recordatorio

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests end-to-end
npm run test:e2e

# Coverage
npm run test:cov
```

## 📊 Lógica de Negocio

### Servicios con Lógica de Negocio

1. **WalletsService**
   - Cálculo de balances (créditos - deudas)
   - Algoritmo de sugerencias de liquidaciones mínimas
   - Gestión de miembros y permisos
   - Creación automática de categorías predeterminadas

2. **TransactionsService**
   - Reglas específicas para billeteras grupales
   - Actualización automática de progreso de metas
   - Agrupación de gastos/ingresos por período
   - Cálculo de balances personales

3. **AuthService**
   - Flujo completo de autenticación Google OAuth
   - Creación automática de billetera personal
   - Generación de códigos únicos

4. **GoalsService**
   - Cálculo automático de progreso
   - Actualización de estados (ACTIVE/PAUSED/ACHIEVED)
   - Validación de permisos y alcance

5. **RemindersService**
   - Creación automática de transacciones al marcar como pagado
   - Renovación automática mensual
   - Validación de fechas

6. **InvitationsService**
   - Generación de tokens únicos
   - Validación de expiración
   - Envío de emails

7. **CategoriesService**
   - Merge inteligente de categorías globales y de billetera
   - Protección de categorías del sistema

8. **UsersService**
   - Eliminación en cascada con transacciones
   - Transferencia automática de propiedad

## 📚 Documentación Adicional

- [Guía de Despliegue](./DEPLOY.md)
- [Guía para Ver Tablas](./GUIA-VER-TABLAS.md)
- [Diagrama UML de Estructura](./estructura.html)

## 🤝 Contribuidores

- [@RuachCrux88](https://github.com/RuachCrux88) - Katherine Rodríguez Mejía
- [@diegolt8](https://github.com/diegolt8)
- [@SebasFj](https://github.com/SebasFj) - Sebastián Flórez Jaramillo

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 🔗 Enlaces

- **Repositorio:** [GitHub](https://github.com/RuachCrux88/finance_backend)
- **Producción:** [financebackend-ecru.vercel.app](https://financebackend-ecru.vercel.app)
- **Documentación NestJS:** [docs.nestjs.com](https://docs.nestjs.com)
- **Documentación Prisma:** [prisma.io/docs](https://www.prisma.io/docs)
