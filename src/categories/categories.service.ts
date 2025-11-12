import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryTypeValue } from '../common/enums';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, type?: CategoryTypeValue, walletId?: string) {
    const typeFilter = type ? { type } : {};

    if (walletId) {
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          id: walletId,
          OR: [{ createdById: userId }, { members: { some: { userId } } }],
        },
      });

      if (!wallet) {
        throw new ForbiddenException('No tienes acceso a esta billetera');
      }

      const walletCategories = await this.prisma.category.findMany({
        where: {
          ...typeFilter,
          walletId,
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        take: 1000,
      });

      const globalCategories = await this.prisma.category.findMany({
        where: {
          ...typeFilter,
          walletId: null,
          isSystem: true,
        },
        orderBy: [{ name: 'asc' }],
        take: 1000,
      });

      const categoryMap = new Map<string, any>();

      walletCategories.forEach((cat) => {
        const key = `${cat.name}_${cat.type}`;
        categoryMap.set(key, cat);
      });

      globalCategories.forEach((cat) => {
        const key = `${cat.name}_${cat.type}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, cat);
        }
      });

      return Array.from(categoryMap.values()).sort((a, b) => {
        if (a.isSystem !== b.isSystem) {
          return a.isSystem ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }

    const allCategories = await this.prisma.category.findMany({
      where: {
        ...typeFilter,
        walletId: null,
        OR: [{ isSystem: true }, { createdById: userId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      take: 1000,
    });

    const categoryMap = new Map<string, any>();
    allCategories.forEach((cat) => {
      const key = `${cat.name}_${cat.type}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, cat);
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => {
      if (a.isSystem !== b.isSystem) {
        return a.isSystem ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    if (dto.walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: dto.walletId },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      if (wallet.createdById !== userId) {
        throw new ForbiddenException('Solo el dueÃ±o puede crear categorÃ­as para esta billetera');
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
    if (!cat) throw new NotFoundException('CategorÃ­a no existe');
    if (cat.isSystem) {
      if (dto.name !== undefined || dto.type !== undefined) {
        throw new ForbiddenException('No puedes modificar el nombre o tipo de categorÃ­as del sistema');
      }
      return this.prisma.category.update({
        where: { id },
        data: dto.description !== undefined ? { description: dto.description } : {},
      });
    }
    if (cat.createdById !== userId) {
      throw new ForbiddenException('No puedes editar esta categorÃ­a');
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
    if (!cat) throw new NotFoundException('CategorÃ­a no existe');
    if (cat.isSystem || cat.createdById !== userId) {
      throw new ForbiddenException('No puedes eliminar esta categorÃ­a');
    }
    if (cat.transactions.length > 0) {
      throw new BadRequestException('No se puede eliminar: la categorÃ­a tiene transacciones');
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  async cleanupDuplicates(userId: string) {
    const allCategories = await this.prisma.category.findMany({
      include: {
        transactions: { take: 1 },
        wallet: true,
      },
    });

    const grouped = new Map<string, any[]>();
    allCategories.forEach((cat) => {
      const key = `${cat.name}_${cat.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(cat);
    });

    let deletedCount = 0;

    for (const categories of grouped.values()) {
      if (categories.length <= 1) continue;

      const global = categories.filter((c) => c.walletId === null);
      const walletSpecific = categories.filter((c) => c.walletId !== null);

      if (global.length > 0) {
        for (const cat of walletSpecific) {
          if (cat.isSystem && cat.transactions.length === 0) {
            await this.prisma.category.delete({ where: { id: cat.id } });
            deletedCount++;
          }
        }
      } else if (walletSpecific.length > 1) {
        const [toKeep, ...rest] = walletSpecific;
        for (const cat of rest) {
          if (cat.transactions.length === 0) {
            await this.prisma.category.delete({ where: { id: cat.id } });
            deletedCount++;
          }
        }
      }
    }

    return {
      message: `Se eliminaron ${deletedCount} categorÃ­as duplicadas`,
      deletedCount,
    };
  }
}
