// Script para ver el estado de las tablas en la base de datos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewTables() {
  try {
    console.log('📊 Verificando estado de las tablas en Neon...\n');

    // Verificar estructura de la tabla User
    console.log('👤 TABLA USER:');
    console.log('─'.repeat(60));
    const users = await prisma.user.findMany({
      take: 5, // Solo mostrar los primeros 5
      orderBy: { createdAt: 'desc' },
      include: {
        accounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            type: true,
          },
        },
      },
    });

    console.log(`Total de usuarios: ${await prisma.user.count()}\n`);
    
    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`Usuario ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Nombre: ${user.name || '(sin nombre)'}`);
        console.log(`  Creado: ${user.createdAt.toLocaleString()}`);
        console.log(`  Email verificado: ${user.emailVerifiedAt ? 'Sí' : 'No'}`);
        console.log(`  Cuentas OAuth: ${user.accounts.length}`);
        if (user.accounts.length > 0) {
          user.accounts.forEach((acc) => {
            console.log(`    - ${acc.provider} (ID: ${acc.providerAccountId.substring(0, 20)}...)`);
          });
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No hay usuarios en la base de datos.\n');
    }

    // Verificar estructura de la tabla Account
    console.log('🔐 TABLA ACCOUNT:');
    console.log('─'.repeat(60));
    const accounts = await prisma.account.findMany({
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`Total de cuentas OAuth: ${await prisma.account.count()}\n`);

    if (accounts.length > 0) {
      accounts.forEach((account, index) => {
        console.log(`Cuenta ${index + 1}:`);
        console.log(`  ID: ${account.id}`);
        console.log(`  Provider: ${account.provider}`);
        console.log(`  Provider Account ID: ${account.providerAccountId}`);
        console.log(`  Type: ${account.type}`);
        console.log(`  Usuario: ${account.user.email} (${account.user.name || 'sin nombre'})`);
        console.log(`  Access Token: ${account.access_token ? 'Presente' : 'No disponible'}`);
        console.log(`  Refresh Token: ${account.refresh_token ? 'Presente' : 'No disponible'}`);
        console.log(`  Expires At: ${account.expires_at ? new Date(account.expires_at * 1000).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No hay cuentas OAuth en la base de datos.\n');
    }

    // Verificar estructura de la tabla (columnas)
    console.log('📋 ESTRUCTURA DE LA TABLA USER:');
    console.log('─'.repeat(60));
    const sampleUser = await prisma.user.findFirst();
    if (sampleUser) {
      const userKeys = Object.keys(sampleUser);
      console.log('Columnas disponibles:');
      userKeys.forEach((key) => {
        const value = (sampleUser as any)[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${key}: ${type}${value === null ? ' (null)' : ''}`);
      });
      console.log('');
      console.log('✅ La tabla User NO tiene el campo "password" (correcto)');
    } else {
      console.log('⚠️  No hay usuarios para verificar la estructura.');
    }

    console.log('\n💡 CONSEJOS PARA VER LAS TABLAS EN NEON:');
    console.log('─'.repeat(60));
    console.log('1. Ve a https://console.neon.tech/');
    console.log('2. Selecciona tu proyecto');
    console.log('3. Ve a la pestaña "SQL Editor"');
    console.log('4. Ejecuta estas consultas:');
    console.log('');
    console.log('   -- Ver todos los usuarios');
    console.log('   SELECT * FROM "User" ORDER BY "createdAt" DESC;');
    console.log('');
    console.log('   -- Ver todas las cuentas OAuth');
    console.log('   SELECT * FROM "Account";');
    console.log('');
    console.log('   -- Ver usuarios con sus cuentas');
    console.log('   SELECT u.*, a.provider, a."providerAccountId"');
    console.log('   FROM "User" u');
    console.log('   LEFT JOIN "Account" a ON u.id = a."userId";');
    console.log('');
    console.log('5. O usa Prisma Studio ejecutando: npx prisma studio');

  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

viewTables();

