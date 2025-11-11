// prisma/seed.ts
import { PrismaClient, CategoryType } from '@prisma/client';
const prisma = new PrismaClient();

type SysCat = { name: string; type: CategoryType; description?: string };

const defaultCategories: SysCat[] = [
  // Gastos
  {
    name: 'Arriendo',
    type: CategoryType.EXPENSE,
    description: 'Pago de arriendo o alquiler',
  },
  {
    name: 'Alimentación',
    type: CategoryType.EXPENSE,
    description: 'Supermercado, restaurantes, comida',
  },
  {
    name: 'Servicios públicos',
    type: CategoryType.EXPENSE,
    description: 'Luz, agua, gas, internet, teléfono',
  },
  {
    name: 'Transporte',
    type: CategoryType.EXPENSE,
    description: 'Público, gasolina, peajes, mantenimiento',
  },
  {
    name: 'Educación',
    type: CategoryType.EXPENSE,
    description: 'Cursos, matrículas, libros, materiales',
  },
  {
    name: 'Salud y cuidado personal',
    type: CategoryType.EXPENSE,
    description: 'Medicinas, citas médicas, productos de cuidado',
  },
  {
    name: 'Deudas y préstamos',
    type: CategoryType.EXPENSE,
    description: 'Pagos de préstamos, tarjetas de crédito',
  },
  {
    name: 'Ocio y entretenimiento',
    type: CategoryType.EXPENSE,
    description: 'Cine, streaming, salidas, hobbies',
  },
  {
    name: 'Ropa y calzado',
    type: CategoryType.EXPENSE,
    description: 'Compra de ropa y zapatos',
  },
  {
    name: 'Imprevistos y reparaciones',
    type: CategoryType.EXPENSE,
    description: 'Gastos inesperados y reparaciones',
  },
  // Ingresos personales
  {
    name: 'Salario',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Nómina, sueldo fijo',
  },
  {
    name: 'Propinas',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Propinas recibidas',
  },
  {
    name: 'Bonificaciones',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Bonos y compensaciones',
  },
  {
    name: 'Freelance',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Trabajos independientes',
  },
  {
    name: 'Comisiones',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Comisiones por ventas',
  },
  {
    name: 'Intereses',
    type: CategoryType.INCOME,
    description: 'Ingreso personal: Intereses de inversiones',
  },
  // Ingresos grupales
  {
    name: 'Aportes a la meta',
    type: CategoryType.INCOME,
    description: 'Ingreso grupal: Aportes para metas grupales',
  },
  {
    name: 'Ganancias del negocio familiar o grupal',
    type: CategoryType.INCOME,
    description: 'Ingreso grupal: Ganancias de negocios compartidos',
  },
  {
    name: 'Remesas recibidas para todo el hogar',
    type: CategoryType.INCOME,
    description: 'Ingreso grupal: Remesas para el hogar',
  },
  {
    name: 'Alquiler de una propiedad familiar',
    type: CategoryType.INCOME,
    description: 'Ingreso grupal: Alquiler de propiedad familiar',
  },
];

async function main() {
  for (const c of defaultCategories) {
    // Buscar si ya existe
    const existing = await prisma.category.findFirst({
      where: {
        name: c.name,
        type: c.type,
        walletId: null,
      },
    });

    if (existing) {
      // Actualizar si existe
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          description: c.description ?? null,
          isSystem: true,
        },
      });
    } else {
      // Crear si no existe
      await prisma.category.create({
        data: {
          name: c.name,
          type: c.type,
          description: c.description ?? null,
          isSystem: true,
          walletId: null, // Categorías globales
        },
      });
    }
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
