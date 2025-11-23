import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Función para generar código único de 10 caracteres alfanuméricos
function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  console.log('Generando códigos para usuarios existentes...');
  
  // Obtener todos los usuarios sin código o con código vacío
  const usersWithoutCode = await prisma.user.findMany({
    where: {
      OR: [
        { userCode: '' },
        { userCode: null },
      ],
    },
  });

  console.log(`Encontrados ${usersWithoutCode.length} usuarios sin código`);

  for (const user of usersWithoutCode) {
    let userCode = generateUserCode();
    let codeExists = true;
    
    // Asegurar que el código sea único
    while (codeExists) {
      const existing = await prisma.user.findUnique({
        where: { userCode },
      });
      if (!existing) {
        codeExists = false;
      } else {
        userCode = generateUserCode();
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { userCode },
    });

    console.log(`Código generado para ${user.email}: ${userCode}`);
  }

  console.log('¡Todos los códigos han sido generados!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

