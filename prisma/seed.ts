// prisma/seed.ts
import { PrismaClient, CategoryType } from '@prisma/client';
const prisma = new PrismaClient();

type SysCat = { name: string; type: CategoryType; description?: string };

const defaultCategories: SysCat[] = [
  // Gastos
  {
    name: 'Comida',
    type: CategoryType.EXPENSE,
    description: 'Super, restaurantes, snacks',
  },
  {
    name: 'Transporte',
    type: CategoryType.EXPENSE,
    description: 'Público, gasolina, peajes',
  },
  {
    name: 'Vivienda',
    type: CategoryType.EXPENSE,
    description: 'Arriendo, servicios, mantenimiento',
  },
  {
    name: 'Salud',
    type: CategoryType.EXPENSE,
    description: 'Medicinas, citas',
  },
  {
    name: 'Entretenimiento',
    type: CategoryType.EXPENSE,
    description: 'Cine, streaming',
  },
  {
    name: 'Educación',
    type: CategoryType.EXPENSE,
    description: 'Cursos, matrículas, libros',
  },
  // Ingresos
  {
    name: 'Salario',
    type: CategoryType.INCOME,
    description: 'Nómina, honorarios',
  },
  {
    name: 'Intereses',
    type: CategoryType.INCOME,
    description: 'Intereses, rendimientos',
  },
  {
    name: 'Ventas',
    type: CategoryType.INCOME,
    description: 'Venta de artículos o servicios',
  },
];

async function main() {
  for (const c of defaultCategories) {
    await prisma.category.upsert({
      // Requiere @@unique([name, type]) en tu modelo Category
      where: { name_type: { name: c.name, type: c.type } },
      update: {
        description: c.description ?? null,
        isSystem: true,
      },
      create: {
        name: c.name,
        type: c.type,
        description: c.description ?? null,
        isSystem: true,
      },
    });
  }

  console.log(
    `✅ Categorías del sistema listas (${defaultCategories.length}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
