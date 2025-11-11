import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GoalsService } from '../goals/goals.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
  ) {}

  // ✅ NUEVA FIRMA: recibe userId para setear createdBy
  async create(userId: string, dto: CreateTransactionDto) {
    try {
      // Verificar que el usuario pertenezca a la billetera
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          id: dto.walletId,
          OR: [{ createdById: userId }, { members: { some: { userId } } }],
        },
        include: { members: true },
      });

      if (!wallet) {
        throw new ForbiddenException('No perteneces a esta billetera');
      }

      // En billeteras grupales, solo permitir transacciones de tipo INCOME (aportes)
      if (wallet.type === 'GROUP' && dto.type !== 'INCOME') {
        throw new BadRequestException('En billeteras grupales solo se permiten aportes (INCOME)');
      }

      // Preparar los datos de la transacción
      const transactionData: Prisma.TransactionCreateInput = {
        wallet: { connect: { id: dto.walletId } },
        type: dto.type,
        amount: new Decimal(dto.amount),
        description: dto.description ?? null,
        paidBy: { connect: { id: dto.paidByUserId } },
        createdBy: { connect: { id: userId } }, // ✅ requerido por tu modelo
      };

      // Solo conectar categoría si se proporciona
      if (dto.categoryId) {
        transactionData.category = { connect: { id: dto.categoryId } };
      }

      // splits opcionales
      if (dto.splits?.length) {
        transactionData.splits = {
          create: dto.splits.map((s) => ({
            owedBy: { connect: { id: s.owedByUserId } },
            amount: new Decimal(s.amount),
          })),
        };
      }

      const transaction = await this.prisma.transaction.create({
        data: transactionData,
        include: {
          splits: {
            include: { owedBy: { select: { id: true, name: true, email: true } } },
          },
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              isSystem: true,
            },
          },
          paidBy: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Si es un aporte en billetera grupal (INCOME), actualizar el progreso de las metas activas
      if (wallet.type === 'GROUP' && dto.type === 'INCOME') {
        const activeGoals = await this.prisma.goal.findMany({
          where: {
            walletId: dto.walletId,
            status: 'ACTIVE',
          },
        });

        // Actualizar cada meta activa con el monto del aporte y registrar quién contribuyó
        for (const goal of activeGoals) {
          await this.goalsService.updateProgress(goal.id, Number(dto.amount), userId, dto.description);
        }
      }

      // Si es un gasto (EXPENSE) que contiene "Aporte a meta" en la descripción, actualizar metas
      // Esto permite que los aportes se hagan desde billeteras personales pero actualicen metas grupales
      if (dto.type === 'EXPENSE' && dto.description && dto.description.includes('Aporte a meta')) {
        // Buscar el nombre de la meta en la descripción (formato: "Aporte a meta: [nombre]")
        const goalNameMatch = dto.description.match(/Aporte a meta: (.+)/);
        if (goalNameMatch) {
          const goalName = goalNameMatch[1].trim();
          // Buscar la meta en todas las billeteras grupales a las que el usuario pertenece
          const userWallets = await this.prisma.wallet.findMany({
            where: {
              OR: [
                { createdById: userId },
                { members: { some: { userId } } },
              ],
              type: 'GROUP',
            },
            include: {
              goals: {
                where: {
                  status: { in: ['ACTIVE', 'PAUSED'] }, // También incluir metas pausadas
                },
              },
            },
          });

          // Encontrar la meta en cualquiera de las billeteras grupales del usuario
          let goalFound = false;
          for (const wallet of userWallets) {
            const goal = wallet.goals.find(g => g.name === goalName);
            if (goal) {
              // Usar el servicio inyectado para actualizar el progreso
              await this.goalsService.updateProgress(goal.id, Number(dto.amount), userId, dto.description);
              goalFound = true;
              break; // Solo actualizar la primera meta encontrada
            }
          }
          
          // Si no se encontró la meta, registrar un error pero no fallar la transacción
          if (!goalFound) {
            console.warn(`Meta "${goalName}" no encontrada para el usuario ${userId}`);
          }
        }
      }

      return transaction;
    } catch (error) {
      console.error('Error al crear transacción:', error);
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Error al crear la transacción'
      );
    }
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
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            isSystem: true,
          },
        },
        paidBy: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: { owedBy: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  // (si ya tienes update, no hace falta tocarlo para estos errores)
  async update(id: string, dto: UpdateTransactionDto) {
    const data: Prisma.TransactionUpdateInput = {};
    if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        data.category = { disconnect: true };
      } else {
        data.category = { connect: { id: dto.categoryId } };
      }
    }
    if (dto.type) data.type = dto.type;
    if (dto.amount !== undefined) data.amount = new Decimal(dto.amount);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.paidByUserId) data.paidBy = { connect: { id: dto.paidByUserId } };

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: { splits: true, category: true, paidBy: true },
    });
  }

  // Obtener gastos e ingresos agrupados por día, semana o mes con detalles
  async getDailyExpensesAndIncome(userId: string, days: number = 90, groupBy: 'day' | 'week' | 'month' = 'day') {
    const maxDays = Math.min(Math.max(days, 7), 1095);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - maxDays);

    const wallets = await this.prisma.wallet.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true, type: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const groupWalletIds = wallets.filter((w) => w.type === 'GROUP').map((w) => w.id);

    if (walletIds.length === 0) {
      return [];
    }

    // Obtener todas las transacciones (gastos y ingresos personales)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: { in: walletIds },
        paidByUserId: userId,
        date: { gte: startDate },
        OR: [
          { type: 'EXPENSE' }, // Todos los gastos
          { 
            type: 'INCOME',
            walletId: { notIn: groupWalletIds }, // Solo ingresos de billeteras personales
          },
        ],
      },
      include: {
        category: { select: { name: true } },
        wallet: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const getGroupKey = (date: Date): string => {
      const d = new Date(date);
      if (groupBy === 'day') {
        return d.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        return monday.toISOString().split('T')[0];
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // Agrupar por fecha
    const groupedMap = new Map<string, { expenses: number; income: number; details: Array<{ type: string; amount: number; category: string; wallet: string; description?: string }> }>();
    
    transactions.forEach((tx) => {
      const key = getGroupKey(tx.date);
      const current = groupedMap.get(key) || { expenses: 0, income: 0, details: [] };
      
      const amount = Number(tx.amount);
      if (tx.type === 'EXPENSE') {
        current.expenses += amount;
      } else {
        current.income += amount;
      }
      
      current.details.push({
        type: tx.type,
        amount,
        category: tx.category?.name || 'Sin categoría',
        wallet: tx.wallet?.name || 'Billetera',
        description: tx.description || undefined,
      });
      
      groupedMap.set(key, current);
    });

    return Array.from(groupedMap.entries())
      .map(([date, data]) => ({
        date,
        expenses: Number(data.expenses.toFixed(2)),
        income: Number(data.income.toFixed(2)),
        details: data.details,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Obtener gastos agrupados por día, semana o mes
  async getDailyExpenses(userId: string, days: number = 90, groupBy: 'day' | 'week' | 'month' = 'day') {
    // Limitar a máximo 3 años (1095 días) y mínimo 2 años (730 días)
    const maxDays = Math.min(Math.max(days, 7), 1095);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - maxDays);

    // Obtener todas las billeteras del usuario
    const wallets = await this.prisma.wallet.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    const walletIds = wallets.map((w) => w.id);

    if (walletIds.length === 0) {
      return [];
    }

    // Obtener transacciones de gastos donde el usuario es quien pagó
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: 'EXPENSE',
        paidByUserId: userId, // Solo transacciones que el usuario pagó
        date: { gte: startDate },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    // Función para obtener la clave de agrupación según el tipo
    const getGroupKey = (date: Date): string => {
      const d = new Date(date);
      if (groupBy === 'day') {
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        // Obtener el lunes de la semana
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que el lunes sea el primer día
        const monday = new Date(d);
        monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
        return monday.toISOString().split('T')[0]; // YYYY-MM-DD del lunes
      } else { // month
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }
    };

    // Agrupar según el tipo
    const groupedMap = new Map<string, number>();
    transactions.forEach((tx) => {
      const key = getGroupKey(tx.date);
      const current = groupedMap.get(key) || 0;
      groupedMap.set(key, current + Number(tx.amount));
    });

    // Convertir a array y ordenar por fecha
    const result = Array.from(groupedMap.entries())
      .map(([date, total]) => ({
        date,
        total: Number(total.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }

  // Limpiar transacciones antiguas (más de 3 años)
  async cleanupOldTransactions() {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const result = await this.prisma.transaction.deleteMany({
      where: {
        date: { lt: threeYearsAgo },
      },
    });

    return { deleted: result.count };
  }

  // Obtener histórico de transacciones del usuario
  // Excluye ingresos de billeteras grupales (solo cuenta ingresos personales)
  async getHistory(userId: string, limit: number = 50) {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true, type: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const groupWalletIds = wallets.filter((w) => w.type === 'GROUP').map((w) => w.id);

    if (walletIds.length === 0) {
      return [];
    }

    return this.prisma.transaction.findMany({
      where: {
        walletId: { in: walletIds },
        paidByUserId: userId, // Solo transacciones que el usuario pagó
        // Excluir ingresos de billeteras grupales
        OR: [
          { type: 'EXPENSE' }, // Todos los gastos se incluyen
          { 
            type: 'INCOME',
            walletId: { notIn: groupWalletIds }, // Solo ingresos de billeteras personales
          },
        ],
      },
      include: {
        category: true,
        paidBy: { select: { id: true, name: true, email: true } },
        wallet: { select: { id: true, name: true, type: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }
}
