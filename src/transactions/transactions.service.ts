import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
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

      // En billeteras grupales, permitir INCOME (aportes) y EXPENSE solo si es un aporte a meta
      // Los aportes a metas son EXPENSE que cuentan como gasto para el usuario que aporta
      if (wallet.type === 'GROUP' && dto.type !== 'INCOME') {
        // Permitir EXPENSE solo si es un aporte a meta (descripción contiene "Aporte a meta")
        const isGoalContribution = dto.description && dto.description.includes('Aporte a meta');
        if (!isGoalContribution) {
          throw new BadRequestException('En billeteras grupales solo se permiten aportes (INCOME) o aportes a metas (EXPENSE con descripción "Aporte a meta")');
        }
      }

      // Preparar los datos de la transacción
      const transactionData: any = {
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

      // NO actualizar automáticamente metas cuando se crea INCOME en billetera grupal
      // Las metas solo se actualizan cuando el usuario explícitamente hace un aporte a una meta específica
      // (usando EXPENSE con descripción "Aporte a meta: [nombre]")

      // Si es un gasto (EXPENSE) que contiene "Aporte a meta" en la descripción, actualizar metas
      // Esto permite que los aportes se hagan en billeteras grupales y actualicen metas grupales
      // Los aportes cuentan como gasto solo para el usuario que aporta (paidByUserId)
      // y NO cuentan como ingreso para otros usuarios
      if (dto.type === 'EXPENSE' && dto.description && dto.description.includes('Aporte a meta')) {
        // Buscar el nombre de la meta en la descripción (formato: "Aporte a meta: [nombre]")
        const goalNameMatch = dto.description.match(/Aporte a meta: (.+)/);
        if (goalNameMatch) {
          const goalName = goalNameMatch[1].trim();
          
          // Si la transacción es en una billetera grupal, buscar la meta en esa billetera
          if (wallet.type === 'GROUP') {
            const goal = await this.prisma.goal.findFirst({
              where: {
                walletId: dto.walletId,
                name: goalName,
                status: { in: ['ACTIVE', 'PAUSED'] },
              },
            });
            
            if (goal) {
              await this.goalsService.updateProgress(goal.id, Number(dto.amount), userId, dto.description);
            } else {
              console.warn(`Meta "${goalName}" no encontrada en la billetera ${dto.walletId}`);
            }
          } else {
            // Si es en billetera personal, buscar primero en metas personales del usuario
            const personalGoal = await this.prisma.goal.findFirst({
              where: {
                userId: userId,
                scope: 'USER',
                name: goalName,
                status: { in: ['ACTIVE', 'PAUSED'] },
              },
            });

            if (personalGoal) {
              await this.goalsService.updateProgress(personalGoal.id, Number(dto.amount), userId, dto.description);
            } else {
              // Si no se encuentra en metas personales, buscar en todas las billeteras grupales del usuario
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
                      status: { in: ['ACTIVE', 'PAUSED'] },
                    },
                  },
                },
              });

              let goalFound = false;
              for (const groupWallet of userWallets) {
                const goal = groupWallet.goals.find(g => g.name === goalName);
                if (goal) {
                  await this.goalsService.updateProgress(goal.id, Number(dto.amount), userId, dto.description);
                  goalFound = true;
                  break;
                }
              }
              
              if (!goalFound) {
                console.warn(`Meta "${goalName}" no encontrada para el usuario ${userId}`);
              }
            }
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
    const data: Record<string, any> = {};
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
    // Permitir mínimo 1 día para usuarios recién registrados
    const minDays = groupBy === 'day' ? 1 : 7;
    const maxDays = Math.min(Math.max(days, minDays), 1095);
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

    const result = Array.from(groupedMap.entries())
      .map(([date, data]) => ({
        date,
        expenses: Number(data.expenses.toFixed(2)),
        income: Number(data.income.toFixed(2)),
        details: data.details,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Si agrupamos por día, rellenar todos los días faltantes con valores de 0
    if (groupBy === 'day') {
      const filledResult: typeof result = [];
      const endDate = new Date();
      const currentDate = new Date(startDate);
      
      // Crear un Set con las fechas que ya tienen datos
      const existingDates = new Set(result.map(r => r.date));
      
      // Iterar día por día desde startDate hasta hoy
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (existingDates.has(dateKey)) {
          // Si ya existe, usar los datos existentes
          const existing = result.find(r => r.date === dateKey);
          if (existing) {
            filledResult.push(existing);
          }
        } else {
          // Si no existe, crear entrada con valores en 0
          filledResult.push({
            date: dateKey,
            expenses: 0,
            income: 0,
            details: [],
          });
        }
        
        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return filledResult;
    }

    return result;
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

  async getStreak(userId: string) {
    // Obtener todas las transacciones del usuario en billeteras personales
    const personalWallets = await this.prisma.wallet.findMany({
      where: {
        OR: [
          { createdById: userId, type: 'PERSONAL' },
          { members: { some: { userId, wallet: { type: 'PERSONAL' } } } },
        ],
      },
      select: { id: true },
    });

    const walletIds = personalWallets.map(w => w.id);

    if (walletIds.length === 0) {
      return {
        currentStreak: 0,
        status: 'none',
        longestStreak: 0,
        longestStreakPeriod: null,
        lastActivityDate: null,
      };
    }

    // Obtener todas las transacciones personales agrupadas por fecha
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: { in: walletIds },
        createdById: userId, // Solo transacciones creadas por el usuario
      },
      select: {
        date: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Obtener fechas únicas (solo fecha, sin hora)
    const activityDates = new Set<string>();
    transactions.forEach(tx => {
      const dateStr = tx.date.toISOString().split('T')[0];
      activityDates.add(dateStr);
    });

    const dates = Array.from(activityDates).sort().reverse(); // Más reciente primero

    if (dates.length === 0) {
      return {
        currentStreak: 0,
        status: 'none',
        longestStreak: 0,
        longestStreakPeriod: null,
        lastActivityDate: null,
      };
    }

    // Calcular racha actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    let currentStreak = 0;
    let status: 'active' | 'danger' | 'lost' | 'none' = 'none';
    const lastActivityDate = dates[0];

    // Calcular racha desde la última fecha de actividad hacia atrás
    if (dates.length > 0) {
      const lastDate = new Date(dates[0]);
      let checkDate = new Date(lastDate);
      let checkDateStr = dates[0];
      
      // Contar días consecutivos desde la última actividad
      while (dates.includes(checkDateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        checkDateStr = checkDate.toISOString().split('T')[0];
      }

      // Determinar estado según cuántos días han pasado desde la última actividad
      const daysSinceLastActivity = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastActivity === 0) {
        // Actividad hoy - racha activa
        status = 'active';
      } else if (daysSinceLastActivity === 1) {
        // Actividad ayer pero no hoy - en peligro (mantener racha)
        status = 'danger';
      } else if (daysSinceLastActivity === 2) {
        // Actividad hace 2 días pero no ayer ni hoy - en peligro (último día)
        status = 'danger';
      } else {
        // Más de 2 días sin actividad - racha perdida
        status = 'lost';
        currentStreak = 0; // Racha perdida, empezar de nuevo
      }
    } else {
      status = 'none';
      currentStreak = 0;
    }

    // Calcular racha más larga histórica
    let longestStreak = 0;
    let longestStreakStart: string | null = null;
    let longestStreakEnd: string | null = null;

    if (dates.length > 0) {
      // Ordenar fechas de más antigua a más reciente para calcular rachas históricas
      const sortedDates = Array.from(activityDates).sort();
      
      let currentRun = 1;
      let runStart = sortedDates[0];
      let runEnd = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Días consecutivos
          currentRun++;
          runEnd = sortedDates[i];
        } else {
          // Racha rota
          if (currentRun > longestStreak) {
            longestStreak = currentRun;
            longestStreakStart = runStart;
            longestStreakEnd = runEnd;
          }
          currentRun = 1;
          runStart = sortedDates[i];
          runEnd = sortedDates[i];
        }
      }

      // Verificar la última racha
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
        longestStreakStart = runStart;
        longestStreakEnd = runEnd;
      }
    }

    return {
      currentStreak,
      status,
      longestStreak,
      longestStreakPeriod: longestStreakStart && longestStreakEnd
        ? {
            start: longestStreakStart,
            end: longestStreakEnd,
          }
        : null,
      lastActivityDate,
    };
  }

  async transferToUser(senderUserId: string, dto: CreateTransferDto) {
    // Buscar usuario receptor por código
    const recipient = await this.prisma.user.findUnique({
      where: { userCode: dto.recipientUserCode },
    });

    if (!recipient) {
      throw new NotFoundException('Usuario receptor no encontrado');
    }

    if (recipient.id === senderUserId) {
      throw new BadRequestException('No puedes transferir dinero a ti mismo');
    }

    // Obtener billeteras personales de ambos usuarios
    const senderWallet = await this.prisma.wallet.findFirst({
      where: {
        createdById: senderUserId,
        type: 'PERSONAL',
        OR: [
          { isDefault: true },
          { type: 'PERSONAL' },
        ],
      },
    });

    const recipientWallet = await this.prisma.wallet.findFirst({
      where: {
        createdById: recipient.id,
        type: 'PERSONAL',
        OR: [
          { isDefault: true },
          { type: 'PERSONAL' },
        ],
      },
    });

    if (!senderWallet) {
      throw new NotFoundException('No se encontró tu billetera personal');
    }

    if (!recipientWallet) {
      throw new NotFoundException('El usuario receptor no tiene billetera personal');
    }

    // Calcular balance del remitente
    const senderTransactions = await this.prisma.transaction.findMany({
      where: {
        walletId: senderWallet.id,
        paidByUserId: senderUserId,
      },
    });

    let senderBalance = 0;
    senderTransactions.forEach(tx => {
      if (tx.type === 'INCOME') {
        senderBalance += Number(tx.amount);
      } else if (tx.type === 'EXPENSE') {
        senderBalance -= Number(tx.amount);
      }
    });

    if (senderBalance < dto.amount) {
      throw new BadRequestException(`Saldo insuficiente. Tu saldo actual es ${senderBalance.toFixed(2)}`);
    }

    // Obtener información del remitente
    const sender = await this.prisma.user.findUnique({
      where: { id: senderUserId },
      select: { name: true, email: true },
    });

    // Crear transacciones en una transacción de base de datos
    const transferDescription = dto.description 
      ? `Transferencia a ${recipient.name || recipient.email}: ${dto.description}`
      : `Transferencia a ${recipient.name || recipient.email}`;

    const receiveDescription = dto.description
      ? `Transferencia de ${sender?.name || sender?.email || 'Usuario'}: ${dto.description}`
      : `Transferencia de ${sender?.name || sender?.email || 'Usuario'}`;

    // Crear ambas transacciones en una transacción atómica
    const result = await this.prisma.$transaction(async (tx) => {
      // Transacción EXPENSE para el remitente
      const senderTransaction = await tx.transaction.create({
        data: {
          wallet: { connect: { id: senderWallet.id } },
          type: 'EXPENSE',
          amount: new Decimal(dto.amount),
          description: transferDescription,
          paidBy: { connect: { id: senderUserId } },
          createdBy: { connect: { id: senderUserId } },
        },
      });

      // Transacción INCOME para el receptor
      const recipientTransaction = await tx.transaction.create({
        data: {
          wallet: { connect: { id: recipientWallet.id } },
          type: 'INCOME',
          amount: new Decimal(dto.amount),
          description: receiveDescription,
          paidBy: { connect: { id: recipient.id } },
          createdBy: { connect: { id: senderUserId } },
        },
      });

      return {
        senderTransaction,
        recipientTransaction,
      };
    });

    return {
      success: true,
      senderTransaction: result.senderTransaction,
      recipientTransaction: result.recipientTransaction,
    };
  }
}
