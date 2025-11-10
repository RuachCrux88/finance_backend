import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWalletDto) {
    const wallet = await this.prisma.wallet.create({
      data: {
        name: dto.name,
        type: dto.type,
        createdById: userId,
        // Para GROUP, agrega miembro OWNER
        members:
          dto.type === 'GROUP'
            ? { create: [{ userId, role: 'OWNER' as Role }] }
            : undefined,
      },
    });
    return wallet;
  }

  async listMine(userId: string) {
    return this.prisma.wallet.findMany({
      where: {
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMember(ownerId: string, walletId: string, email: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: { members: true },
    });
    if (!wallet) throw new NotFoundException('Billetera no encontrada');
    // Solo OWNER puede invitar
    const isOwner = wallet.members.some(
      (m) => m.userId === ownerId && m.role === 'OWNER',
    );
    if (wallet.createdById !== ownerId && !isOwner) {
      throw new ForbiddenException('No tienes permisos para agregar miembros');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user)
      throw new BadRequestException('No existe un usuario con ese correo');

    const already = wallet.members.find((m) => m.userId === user.id);
    if (already) return already; // idempotente

    return this.prisma.walletMember.create({
      data: { walletId, userId: user.id, role: 'MEMBER' },
    });
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
}
