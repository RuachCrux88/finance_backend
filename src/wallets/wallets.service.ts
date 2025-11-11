import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto';
import { Role, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomBytes } from 'crypto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  // Genera un código único de 8 caracteres
  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async create(userId: string, dto: CreateWalletDto) {
    // Generar código único
    let inviteCode = this.generateInviteCode();
    let exists = true;
    
    // Asegurar que el código sea único
    while (exists) {
      const existing = await this.prisma.wallet.findUnique({
        where: { inviteCode },
      });
      if (!existing) {
        exists = false;
      } else {
        inviteCode = this.generateInviteCode();
      }
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        name: dto.name,
        type: dto.type,
        currency: dto.currency || 'COP',
        inviteCode,
        createdById: userId,
        // Para GROUP, agrega miembro OWNER
        members:
          dto.type === 'GROUP'
            ? { create: [{ userId, role: 'OWNER' as Role }] }
            : undefined,
      },
    });

    // Crear categorías predeterminadas para la billetera
    const defaultCategories = [
      // Gastos
      { name: 'Arriendo', type: 'EXPENSE' as const, description: 'Pago de arriendo o alquiler' },
      { name: 'Alimentación', type: 'EXPENSE' as const, description: 'Supermercado, restaurantes, comida' },
      { name: 'Servicios públicos', type: 'EXPENSE' as const, description: 'Luz, agua, gas, internet, teléfono' },
      { name: 'Transporte', type: 'EXPENSE' as const, description: 'Público, gasolina, peajes, mantenimiento' },
      { name: 'Educación', type: 'EXPENSE' as const, description: 'Cursos, matrículas, libros, materiales' },
      { name: 'Salud y cuidado personal', type: 'EXPENSE' as const, description: 'Medicinas, citas médicas, productos de cuidado' },
      { name: 'Deudas y préstamos', type: 'EXPENSE' as const, description: 'Pagos de préstamos, tarjetas de crédito' },
      { name: 'Ocio y entretenimiento', type: 'EXPENSE' as const, description: 'Cine, streaming, salidas, hobbies' },
      { name: 'Ropa y calzado', type: 'EXPENSE' as const, description: 'Compra de ropa y zapatos' },
      { name: 'Imprevistos y reparaciones', type: 'EXPENSE' as const, description: 'Gastos inesperados y reparaciones' },
      // Agregar "Aportes a la meta" también para billeteras personales
      { name: 'Aportes a la meta', type: 'EXPENSE' as const, description: 'Gasto personal: Aportes para metas grupales (se resta de ingresos y suma a gastos)' },
      // Ingresos
      { name: 'Salario', type: 'INCOME' as const, description: 'Ingreso personal: Nómina, sueldo fijo' },
      { name: 'Propinas', type: 'INCOME' as const, description: 'Ingreso personal: Propinas recibidas' },
      { name: 'Bonificaciones', type: 'INCOME' as const, description: 'Ingreso personal: Bonos y compensaciones' },
      { name: 'Freelance', type: 'INCOME' as const, description: 'Ingreso personal: Trabajos independientes' },
      { name: 'Comisiones', type: 'INCOME' as const, description: 'Ingreso personal: Comisiones por ventas' },
      { name: 'Intereses', type: 'INCOME' as const, description: 'Ingreso personal: Intereses de inversiones' },
    ];

        // Si es billetera grupal, agregar categorías de ingresos grupales
        if (dto.type === 'GROUP') {
          defaultCategories.push(
        { name: 'Ganancias del negocio familiar o grupal', type: 'INCOME' as const, description: 'Ingreso grupal: Ganancias de negocios compartidos' },
        { name: 'Remesas recibidas para todo el hogar', type: 'INCOME' as const, description: 'Ingreso grupal: Remesas para el hogar' },
        { name: 'Alquiler de una propiedad familiar', type: 'INCOME' as const, description: 'Ingreso grupal: Alquiler de propiedad familiar' },
      );
    }

    // Crear categorías predeterminadas
    for (const cat of defaultCategories) {
      await this.prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          description: cat.description,
          isSystem: true,
          wallet: { connect: { id: wallet.id } },
        },
      });
    }

    return wallet;
  }

  async listMine(userId: string) {
    // Verificar si el usuario tiene una billetera personal predefinida
    const hasDefaultWallet = await this.prisma.wallet.findFirst({
      where: {
        createdById: userId,
        isDefault: true,
        type: 'PERSONAL',
      },
    });

    // Si no tiene billetera personal predefinida, crearla
    if (!hasDefaultWallet) {
      let inviteCode = this.generateInviteCode();
      let exists = true;
      
      // Asegurar que el código sea único
      while (exists) {
        const existing = await this.prisma.wallet.findUnique({
          where: { inviteCode },
        });
        if (!existing) {
          exists = false;
        } else {
          inviteCode = this.generateInviteCode();
        }
      }

      const defaultWallet = await this.prisma.wallet.create({
        data: {
          name: 'Billetera personal',
          type: 'PERSONAL',
          currency: 'COP',
          inviteCode,
          isDefault: true,
          createdById: userId,
        },
      });

      // Crear categorías predeterminadas para la billetera personal
      const defaultCategories = [
        // Gastos
        { name: 'Arriendo', type: 'EXPENSE' as const, description: 'Pago de arriendo o alquiler' },
        { name: 'Alimentación', type: 'EXPENSE' as const, description: 'Supermercado, restaurantes, comida' },
        { name: 'Servicios públicos', type: 'EXPENSE' as const, description: 'Luz, agua, gas, internet, teléfono' },
        { name: 'Transporte', type: 'EXPENSE' as const, description: 'Público, gasolina, peajes, mantenimiento' },
        { name: 'Educación', type: 'EXPENSE' as const, description: 'Cursos, matrículas, libros, materiales' },
        { name: 'Salud y cuidado personal', type: 'EXPENSE' as const, description: 'Medicinas, citas médicas, productos de cuidado' },
        { name: 'Deudas y préstamos', type: 'EXPENSE' as const, description: 'Pagos de préstamos, tarjetas de crédito' },
        { name: 'Ocio y entretenimiento', type: 'EXPENSE' as const, description: 'Cine, streaming, salidas, hobbies' },
        { name: 'Ropa y calzado', type: 'EXPENSE' as const, description: 'Compra de ropa y zapatos' },
        { name: 'Imprevistos y reparaciones', type: 'EXPENSE' as const, description: 'Gastos inesperados y reparaciones' },
        { name: 'Aportes a la meta', type: 'EXPENSE' as const, description: 'Gasto personal: Aportes para metas grupales (se resta de ingresos y suma a gastos)' },
        // Ingresos
        { name: 'Salario', type: 'INCOME' as const, description: 'Ingreso personal: Nómina, sueldo fijo' },
        { name: 'Propinas', type: 'INCOME' as const, description: 'Ingreso personal: Propinas recibidas' },
        { name: 'Bonificaciones', type: 'INCOME' as const, description: 'Ingreso personal: Bonos y compensaciones' },
        { name: 'Freelance', type: 'INCOME' as const, description: 'Ingreso personal: Trabajos independientes' },
        { name: 'Comisiones', type: 'INCOME' as const, description: 'Ingreso personal: Comisiones por ventas' },
        { name: 'Intereses', type: 'INCOME' as const, description: 'Ingreso personal: Intereses de inversiones' },
      ];

      for (const cat of defaultCategories) {
        await this.prisma.category.create({
          data: {
            name: cat.name,
            type: cat.type,
            description: cat.description,
            isSystem: true,
            wallet: { connect: { id: defaultWallet.id } },
          },
        });
      }
    }

    return this.prisma.wallet.findMany({
      where: {
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        inviteCode: true,
        isDefault: true,
        createdAt: true,
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(walletId: string, userId: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        goals: {
          where: { status: { in: ['ACTIVE', 'PAUSED'] } },
          include: {
            createdBy: {
              select: { id: true, email: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada o no tienes acceso');
    }

    return wallet;
  }

  // Unirse a billetera por código
  async joinByCode(userId: string, inviteCode: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: { members: true },
    });

    if (!wallet) {
      throw new NotFoundException('Código de billetera no válido');
    }

    // Solo billeteras grupales pueden tener miembros
    if (wallet.type !== 'GROUP') {
      throw new BadRequestException('Solo las billeteras grupales permiten unirse por código');
    }

    // Verificar que no sea ya miembro
    const isAlreadyMember = wallet.members.some((m) => m.userId === userId);
    if (isAlreadyMember) {
      throw new BadRequestException('Ya eres miembro de esta billetera');
    }

    // Verificar que no sea el dueño
    if (wallet.createdById === userId) {
      throw new BadRequestException('Ya eres el dueño de esta billetera');
    }

    // Agregar como miembro
    return this.prisma.walletMember.create({
      data: {
        walletId: wallet.id,
        userId,
        role: 'MEMBER',
      },
    });
  }

  // Verificar si el usuario es dueño
  private async verifyOwner(userId: string, walletId: string): Promise<void> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: { members: true },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    const isOwner = wallet.createdById === userId || 
      wallet.members.some((m) => m.userId === userId && m.role === 'OWNER');

    if (!isOwner) {
      throw new ForbiddenException('Solo el dueño puede realizar esta acción');
    }
  }

  // Remover miembro (solo dueño)
  async removeMember(ownerId: string, walletId: string, memberId: string) {
    await this.verifyOwner(ownerId, walletId);

    const member = await this.prisma.walletMember.findFirst({
      where: {
        id: memberId,
        walletId,
      },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado');
    }

    // No permitir remover al dueño
    if (member.role === 'OWNER') {
      throw new BadRequestException('No se puede remover al dueño de la billetera');
    }

    await this.prisma.walletMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  // Salirse de una billetera (cualquier miembro puede hacerlo)
  async leaveWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    const membership = wallet.members.find(m => m.userId === userId);
    if (!membership) {
      throw new BadRequestException('No eres miembro de esta billetera');
    }

    // Si es el dueño y hay otros miembros, transferir propiedad
    if (membership.role === 'OWNER' && wallet.type === 'GROUP') {
      const otherMember = await this.prisma.walletMember.findFirst({
        where: {
          walletId,
          userId: { not: userId },
        },
      });

      if (otherMember) {
        // Transferir propiedad a otro miembro
        await this.prisma.$transaction(async (tx) => {
          await tx.walletMember.update({
            where: { id: otherMember.id },
            data: { role: 'OWNER' },
          });
          await tx.wallet.update({
            where: { id: walletId },
            data: { createdById: otherMember.userId },
          });
          await tx.walletMember.delete({
            where: { id: membership.id },
          });
        });
        return { success: true, message: 'Te has salido de la billetera. La propiedad fue transferida a otro miembro.' };
      } else {
        // Si no hay otros miembros, eliminar la billetera
        await this.prisma.wallet.delete({
          where: { id: walletId },
        });
        return { success: true, message: 'Te has salido de la billetera. La billetera fue eliminada por no tener más miembros.' };
      }
    } else {
      // Si no es dueño, simplemente remover la membresía
      await this.prisma.walletMember.delete({
        where: { id: membership.id },
      });
      return { success: true, message: 'Te has salido de la billetera' };
    }
  }

  // Actualizar nombre (solo dueño)
  async updateName(ownerId: string, walletId: string, newName: string) {
    await this.verifyOwner(ownerId, walletId);

    if (!newName.trim() || newName.trim().length < 3) {
      throw new BadRequestException('El nombre debe tener al menos 3 caracteres');
    }

    return this.prisma.wallet.update({
      where: { id: walletId },
      data: { name: newName.trim() },
    });
  }

  // Eliminar billetera (solo dueño, no se puede eliminar billeteras predefinidas)
  async delete(ownerId: string, walletId: string) {
    await this.verifyOwner(ownerId, walletId);

    // Verificar que no sea una billetera predefinida
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: { isDefault: true },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    if (wallet.isDefault) {
      throw new ForbiddenException('No se puede eliminar la billetera personal predefinida');
    }

    await this.prisma.wallet.delete({
      where: { id: walletId },
    });

    return { success: true };
  }

  /**
   * Lógica de negocio #1: Balance por billetera.
   * Para cada miembro, net = sum(creditos) - sum(deudas).
   * - Créditos: en transacciones del wallet donde él es pagador, suma TODOS los splits de la transacción (lo que otros le deben).
   * - Deudas: en splits donde owedByUserId == él, suma su parte.
   */
  async computeBalances(walletId: string) {
    // Trae splits con la transacción y su pagador
    const splits = await this.prisma.transactionSplit.findMany({
      where: { transaction: { walletId } },
      include: { transaction: { select: { paidByUserId: true } } },
    });

    // Trae miembros para asegurar salida completa
    const members = await this.prisma.walletMember.findMany({
      where: { walletId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    const map = new Map<
      string,
      { userId: string; email?: string; name?: string; net: number }
    >();
    for (const m of members) {
      map.set(m.userId, {
        userId: m.userId,
        email: m.user.email,
        name: m.user.name ?? undefined,
        net: 0,
      });
    }

    for (const s of splits) {
      const payer = s.transaction.paidByUserId;
      const debtor = s.owedByUserId;
      const amt = Number(s.amount);

      // crédito para el pagador (alguien le debe)
      if (!map.has(payer)) map.set(payer, { userId: payer, net: 0 });
      map.get(payer)!.net += amt;

      // deuda para el deudor
      if (!map.has(debtor)) map.set(debtor, { userId: debtor, net: 0 });
      map.get(debtor)!.net -= amt;
    }

    return Array.from(map.values());
  }

  /**
   * Lógica de negocio #2: Sugerencia de liquidaciones mínimas
   * Dado el neto de cada miembro, genera un set de transferencias (from -> to) para saldar.
   */
  async suggestSettlements(walletId: string) {
    const balances = await this.computeBalances(walletId);
    const debtors = balances
      .filter((b) => b.net < 0)
      .map((b) => ({ ...b, net: -b.net })); // convierto a positivo
    const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b }));

    const settlements: Array<{
      fromUserId: string;
      toUserId: string;
      amount: number;
    }> = [];

    let i = 0,
      j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].net, creditors[j].net);
      settlements.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount: +pay.toFixed(2),
      });
      debtors[i].net -= pay;
      creditors[j].net -= pay;
      if (debtors[i].net <= 1e-6) i++;
      if (creditors[j].net <= 1e-6) j++;
    }

    return { settlements };
  }

  // Crear un settlement (liquidación de deuda)
  async createSettlement(userId: string, walletId: string, fromUserId: string, toUserId: string, amount: number) {
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

    // Verificar que fromUserId y toUserId sean miembros
    const members = await this.prisma.walletMember.findMany({
      where: { walletId },
      select: { userId: true },
    });

    const memberIds = members.map(m => m.userId);
    if (!memberIds.includes(fromUserId) || !memberIds.includes(toUserId)) {
      throw new BadRequestException('Los usuarios deben ser miembros de la billetera');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestException('No puedes liquidar contigo mismo');
    }

    // Crear el settlement
    const settlement = await this.prisma.settlement.create({
      data: {
        walletId,
        fromUserId,
        toUserId,
        amount: new Decimal(amount),
        createdById: userId,
      },
    });

    // Crear transacción tipo SETTLEMENT
    await this.prisma.transaction.create({
      data: {
        walletId,
        categoryId: (await this.prisma.category.findFirst({
          where: { walletId, name: 'Liquidación de deuda', type: 'EXPENSE' },
        }))?.id || (await this.prisma.category.findFirst({
          where: { walletId: null, name: 'Imprevistos y reparaciones', type: 'EXPENSE' },
        }))!.id,
        type: 'SETTLEMENT',
        amount: new Decimal(amount),
        paidByUserId: fromUserId,
        createdById: userId,
        description: `Liquidación de deuda de ${fromUserId} a ${toUserId}`,
      },
    });

    // Marcar splits relacionados como settled
    const splits = await this.prisma.transactionSplit.findMany({
      where: {
        transaction: {
          walletId,
          paidByUserId: toUserId,
        },
        owedByUserId: fromUserId,
        settled: false,
      },
      include: { transaction: true },
      orderBy: { transaction: { date: 'asc' } },
    });

    let remainingAmount = amount;
    for (const split of splits) {
      if (remainingAmount <= 0) break;
      const splitAmount = Number(split.amount);
      if (splitAmount <= remainingAmount) {
        await this.prisma.transactionSplit.update({
          where: { id: split.id },
          data: { settled: true },
        });
        remainingAmount -= splitAmount;
      } else {
        // Split parcial - crear nuevo split con el resto
        await this.prisma.transactionSplit.update({
          where: { id: split.id },
          data: { amount: new Decimal(remainingAmount), settled: true },
        });
        await this.prisma.transactionSplit.create({
          data: {
            transactionId: split.transactionId,
            owedByUserId: fromUserId,
            amount: new Decimal(splitAmount - remainingAmount),
            settled: false,
          },
        });
        remainingAmount = 0;
      }
    }

    return settlement;
  }

  // Listar settlements de una billetera
  async listSettlements(walletId: string, userId: string) {
    // Verificar acceso
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
    });

    if (!wallet) {
      throw new ForbiddenException('No tienes acceso a esta billetera');
    }

    return this.prisma.settlement.findMany({
      where: { walletId },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
