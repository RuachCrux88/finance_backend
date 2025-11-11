import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, type?: CategoryType, walletId?: string) {
    // Si se especifica walletId, devolver categorías de esa billetera (predeterminadas + personalizadas)
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

      return this.prisma.category.findMany({
        where: {
          AND: [
            type ? { type } : {},
            { walletId }, // Solo categorías de esta billetera
          ],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        take: 1000, // Limitar resultados
      });
    }

    // Si no hay walletId, devolver categorías globales del sistema
    return this.prisma.category.findMany({
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
}
