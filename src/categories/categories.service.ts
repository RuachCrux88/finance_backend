import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: {
        AND: [
          type ? { type } : {},
          { OR: [{ isSystem: true }, { createdById: userId }] },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description ?? null,
        isSystem: false,
        createdBy: { connect: { id: userId } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no existe');
    if (cat.isSystem || cat.createdById !== userId) {
      throw new ForbiddenException('No puedes editar esta categoría');
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
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
