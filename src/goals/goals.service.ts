import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    // Si es una meta de billetera, verificar que el usuario sea el dueño
    if (dto.walletId) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: dto.walletId },
        include: { members: true },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      // Verificar que el usuario sea el dueño (solo el dueño puede crear metas)
      const isOwner = wallet.createdById === userId || 
                     wallet.members.some((m) => m.userId === userId && m.role === 'OWNER');
      
      if (!isOwner) {
        throw new ForbiddenException('Solo el dueño de la billetera puede crear metas');
      }

      // Solo permitir metas grupales en billeteras grupales
      if (wallet.type !== 'GROUP') {
        throw new BadRequestException('Las metas grupales solo se pueden crear en billeteras grupales');
      }
    }

    const goal = await this.prisma.goal.create({
      data: {
        scope: dto.walletId ? 'WALLET' : 'USER',
        walletId: dto.walletId || null,
        userId: dto.walletId ? null : userId,
        name: dto.name,
        targetAmount: new Prisma.Decimal(dto.targetAmount),
        currentAmount: new Prisma.Decimal(0),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        createdById: userId,
      },
      include: {
        wallet: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return goal;
  }

  async findByWallet(walletId: string, userId: string) {
    // Verificar que el usuario pertenezca a la billetera
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
    });

    if (!wallet) {
      throw new ForbiddenException('No perteneces a esta billetera');
    }

    return this.prisma.goal.findMany({
      where: {
        walletId,
        status: { in: ['ACTIVE', 'PAUSED'] }, // Incluir pausadas también
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string, includePaused: boolean = true) {
    return this.prisma.goal.findMany({
      where: {
        userId,
        scope: 'USER',
        status: includePaused ? { in: ['ACTIVE', 'PAUSED'] } : 'ACTIVE',
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    // Verificar que el usuario sea el creador de la meta
    if (goal.createdById !== userId) {
      throw new ForbiddenException('No puedes eliminar esta meta');
    }

    await this.prisma.goal.delete({
      where: { id: goalId },
    });

    return { success: true };
  }

  async updateProgress(goalId: string, amount: number, userId: string, note?: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    const newCurrentAmount = Number(goal.currentAmount) + amount;
    const newStatus = newCurrentAmount >= Number(goal.targetAmount) ? 'ACHIEVED' : goal.status;

    // Crear registro de progreso
    await this.prisma.goalProgress.create({
      data: {
        goalId,
        amount: new Prisma.Decimal(amount),
        note: note || null,
        createdById: userId,
      },
    });

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount: new Prisma.Decimal(newCurrentAmount),
        status: newStatus as any,
      },
    });
  }

  async update(userId: string, goalId: string, dto: { name?: string; targetAmount?: number; deadline?: string; status?: string }) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    // Verificar que el usuario sea el creador de la meta
    if (goal.createdById !== userId) {
      throw new ForbiddenException('No puedes modificar esta meta');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.targetAmount !== undefined) updateData.targetAmount = new Prisma.Decimal(dto.targetAmount);
    if (dto.deadline !== undefined) updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.status && ['ACTIVE', 'PAUSED', 'CANCELLED', 'ACHIEVED'].includes(dto.status)) {
      updateData.status = dto.status;
    }

    return this.prisma.goal.update({
      where: { id: goalId },
      data: updateData,
    });
  }

  async getProgress(goalId: string, userId: string) {
    // Verificar que el usuario tenga acceso a la meta
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        wallet: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta no encontrada');
    }

    // Verificar acceso
    if (goal.walletId && goal.wallet) {
      const hasAccess = goal.wallet.createdById === userId || 
                       goal.wallet.members.some(m => m.userId === userId);
      if (!hasAccess) {
        throw new ForbiddenException('No tienes acceso a esta meta');
      }
    } else if (goal.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta meta');
    }

    return this.prisma.goalProgress.findMany({
      where: { goalId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
}

