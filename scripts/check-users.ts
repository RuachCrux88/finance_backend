// Script para verificar usuarios en la base de datos
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Consultando usuarios en la base de datos...\n');

    const users = await prisma.user.findMany({
      include: {
        accounts: true,
        walletsOwned: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos.');
      console.log('   Esto puede significar que:');
      console.log('   1. Aún no se ha iniciado sesión con Google');
      console.log('   2. Hay un error en el proceso de autenticación');
      console.log('   3. La conexión a la base de datos no está funcionando correctamente\n');
    } else {
      users.forEach((user, index) => {
        console.log(`👤 Usuario ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Nombre: ${user.name || '(sin nombre)'}`);
        console.log(`   Creado: ${user.createdAt}`);
        console.log(`   Email verificado: ${user.emailVerifiedAt ? 'Sí' : 'No'}`);
        console.log(`   Cuentas OAuth: ${user.accounts.length}`);
        user.accounts.forEach((account) => {
          console.log(`     - ${account.provider} (${account.providerAccountId})`);
        });
        console.log(`   Billeteras: ${user.walletsOwned.length}`);
        user.walletsOwned.forEach((wallet) => {
          console.log(`     - ${wallet.name} (${wallet.type})`);
        });
        console.log('');
      });
    }

    // Verificar también las cuentas directamente
    const accounts = await prisma.account.findMany({
      include: {
        user: true,
      },
    });

    console.log(`🔐 Total de cuentas OAuth: ${accounts.length}`);
    accounts.forEach((account) => {
      console.log(`   - ${account.provider}: ${account.providerAccountId} (Usuario: ${account.user.email})`);
    });
  } catch (error) {
    console.error('❌ Error al consultar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

