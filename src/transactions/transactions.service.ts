import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ NUEVA FIRMA: recibe userId para setear createdBy
  async create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        wallet: { connect: { id: dto.walletId } },
        category: { connect: { id: dto.categoryId } },
        type: dto.type,
        amount: new Prisma.Decimal(dto.amount),
        description: dto.description ?? null,
        paidBy: { connect: { id: dto.paidByUserId } },
        createdBy: { connect: { id: userId } }, // ✅ requerido por tu modelo

        // splits opcionales
        ...(dto.splits?.length
          ? {
              splits: {
                create: dto.splits.map((s) => ({
                  owedBy: { connect: { id: s.owedByUserId } },
                  amount: new Prisma.Decimal(s.amount),
                })),
              },
            }
          : {}),
      },
      include: { splits: true, category: true, paidBy: true },
    });
  }

  // ✅ LISTAR TRANSACCIONES DE UNA BILLETERA (con verificación de pertenencia)
  async listByWallet(userId: string, walletId: string) {
    const allowed = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });
    if (!allowed)
      throw new ForbiddenException('No perteneces a esta billetera');

    return this.prisma.transaction.findMany({
      where: { walletId },
      include: {
        category: true,
        paidBy: { select: { id: true, name: true, email: true } },
        splits: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  // (si ya tienes update, no hace falta tocarlo para estos errores)
  async update(id: string, dto: UpdateTransactionDto) {
    const data: Prisma.TransactionUpdateInput = {};
    if (dto.categoryId) data.category = { connect: { id: dto.categoryId } };
    if (dto.type) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.paidByUserId) data.paidBy = { connect: { id: dto.paidByUserId } };

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: { splits: true, category: true, paidBy: true },
    });
  }
}
