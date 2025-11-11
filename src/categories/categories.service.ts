import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, type?: CategoryType, walletId?: string) {
    // Si se especifica walletId, devolver categorías de esa billetera + categorías globales (sin duplicados)
    if (walletId) {
      // Verificar que el usuario tenga acceso a la billetera
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          id: walletId,
          OR: [{ createdById: userId }, { members: { some: { userId } } }],
        },
      });

      if (!wallet) {
        throw new ForbiddenException('No tienes acceso a esta billetera');
      }

      // Obtener categorías de la billetera
      const walletCategories = await this.prisma.category.findMany({
        where: {
          AND: [
            type ? { type } : {},
            { walletId }, // Solo categorías de esta billetera
          ],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        take: 1000,
      });

      // Obtener categorías globales del sistema
      const globalCategories = await this.prisma.category.findMany({
        where: {
          AND: [
            type ? { type } : {},
            { walletId: null }, // Solo categorías globales
            { isSystem: true },
          ],
        },
        orderBy: [{ name: 'asc' }],
        take: 1000,
      });

      // Combinar y eliminar duplicados por nombre y tipo
      const categoryMap = new Map<string, any>();
      
      // Primero agregar las de la billetera (tienen prioridad)
      walletCategories.forEach(cat => {
        const key = `${cat.name}_${cat.type}`;
        categoryMap.set(key, cat);
      });

      // Luego agregar las globales solo si no existen ya
      globalCategories.forEach(cat => {
        const key = `${cat.name}_${cat.type}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, cat);
        }
      });

      return Array.from(categoryMap.values()).sort((a, b) => {
        // Ordenar: primero isSystem, luego por nombre
        if (a.isSystem !== b.isSystem) {
          return a.isSystem ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }

    // Si no hay walletId, devolver categorías globales del sistema (sin duplicados)
    const allCategories = await this.prisma.category.findMany({
      where: {
        AND: [
          type ? { type } : {},
          { walletId: null }, // Solo categorías globales
          { OR: [{ isSystem: true }, { createdById: userId }] },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      take: 1000, // Limitar resultados para evitar problemas
    });

    // Eliminar duplicados por nombre y tipo (mantener solo la primera ocurrencia)
    const categoryMap = new Map<string, any>();
    allCategories.forEach(cat => {
      const key = `${cat.name}_${cat.type}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, cat);
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => {
      // Ordenar: primero isSystem, luego por nombre
      if (a.isSystem !== b.isSystem) {
        return a.isSystem ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    // Si se especifica walletId, verificar que el usuario sea dueño
    if (dto.walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: dto.walletId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (wallet.createdById !== userId) {
        throw new ForbiddenException('Solo el dueño puede crear categorías para esta billetera');
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description ?? null,
        isSystem: false,
        ...(dto.walletId ? { wallet: { connect: { id: dto.walletId } } } : {}),
        createdBy: { connect: { id: userId } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no existe');
    // Permitir editar categorías del sistema (solo descripción) y categorías propias
    if (cat.isSystem) {
      // Para categorías del sistema, solo permitir modificar la descripción
      if (dto.name !== undefined || dto.type !== undefined) {
        throw new ForbiddenException('No puedes modificar el nombre o tipo de categorías del sistema');
      }
      return this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
      });
    }
    // Para categorías propias, permitir modificar todo
    if (cat.createdById !== userId) {
      throw new ForbiddenException('No puedes editar esta categoría');
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { transactions: { take: 1 } },
    });
    if (!cat) throw new NotFoundException('Categoría no existe');
    if (cat.isSystem || cat.createdById !== userId) {
      throw new ForbiddenException('No puedes eliminar esta categoría');
    }
    if (cat.transactions.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar: la categoría tiene transacciones',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async cleanupDuplicates(userId: string) {
    // Obtener todas las categorías agrupadas por nombre y tipo
    const allCategories = await this.prisma.category.findMany({
      include: {
        transactions: { take: 1 },
        wallet: true,
      },
    });

    // Agrupar por nombre y tipo
    const grouped = new Map<string, any[]>();
    allCategories.forEach(cat => {
      const key = `${cat.name}_${cat.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(cat);
    });

    let deletedCount = 0;

    // Para cada grupo, mantener solo una categoría (prioridad: global > billetera)
    for (const [key, categories] of grouped.entries()) {
      if (categories.length <= 1) continue; // No hay duplicados

      // Separar globales y de billetera
      const global = categories.filter(c => c.walletId === null);
      const walletSpecific = categories.filter(c => c.walletId !== null);

      // Si hay una global, eliminar todas las de billetera que sean del sistema
      if (global.length > 0) {
        for (const cat of walletSpecific) {
          // Solo eliminar si es del sistema y no tiene transacciones
          if (cat.isSystem && cat.transactions.length === 0) {
            await this.prisma.category.delete({ where: { id: cat.id } });
            deletedCount++;
          }
        }
      } else if (walletSpecific.length > 1) {
        // Si no hay globales pero hay múltiples de billetera, mantener solo la primera
        const toKeep = walletSpecific[0];
        for (let i = 1; i < walletSpecific.length; i++) {
          const cat = walletSpecific[i];
          // Solo eliminar si no tiene transacciones
          if (cat.transactions.length === 0) {
            await this.prisma.category.delete({ where: { id: cat.id } });
            deletedCount++;
          }
        }
      }
    }

    return { 
      message: `Se eliminaron ${deletedCount} categorías duplicadas`,
      deletedCount 
    };
  }
}
