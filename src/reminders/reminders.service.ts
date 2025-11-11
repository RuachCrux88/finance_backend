import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto, UpdateReminderDto } from './dto';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(userId: string, dto: CreateReminderDto) {
    // Verificar que el usuario pertenezca a la billetera
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: dto.walletId,
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      },
    });

    if (!wallet) {
      throw new ForbiddenException('No perteneces a esta billetera');
    }

    // Verificar que la categoría existe y es de tipo EXPENSE
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.type !== 'EXPENSE') {
      throw new BadRequestException('La categoría debe ser de tipo EXPENSE (gasto)');
    }

    // Validar que la fecha de vencimiento no sea anterior a la fecha actual
    const dueDate = new Date(dto.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparar solo fechas
    
    if (dueDate < today) {
      throw new BadRequestException('La fecha de vencimiento no puede ser anterior a la fecha actual');
    }

    // Si hay fecha de recordatorio, validar que no sea anterior a hoy
    if (dto.reminderDate) {
      const reminderDate = new Date(dto.reminderDate);
      if (reminderDate < today) {
        throw new BadRequestException('La fecha de recordatorio no puede ser anterior a la fecha actual');
      }
    }

    const reminder = await this.prisma.paymentReminder.create({
      data: {
        userId,
        walletId: dto.walletId,
        categoryId: dto.categoryId,
        name: dto.name,
        amount: new Decimal(dto.amount),
        description: dto.description ?? null,
        dueDate: new Date(dto.dueDate),
        reminderDate: dto.reminderDate ? new Date(dto.reminderDate) : null,
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return reminder;
  }

  async findAll(userId: string, includePaid: boolean = false) {
    const where: any = {
      userId,
    };

    if (!includePaid) {
      where.isPaid = false;
    }

    const reminders = await this.prisma.paymentReminder.findMany({
      where,
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            date: true,
          },
        },
      },
      orderBy: [
        { isPaid: 'asc' },
        { dueDate: 'asc' },
      ],
    });

    return reminders;
  }

  async findOne(id: string, userId: string) {
    const reminder = await this.prisma.paymentReminder.findUnique({
      where: { id },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            date: true,
          },
        },
      },
    });

    if (!reminder) {
      throw new NotFoundException('Recordatorio no encontrado');
    }

    if (reminder.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a este recordatorio');
    }

    return reminder;
  }

  async update(id: string, userId: string, dto: UpdateReminderDto) {
    const reminder = await this.findOne(id, userId);

    const updateData: any = {};

    // Validar fechas si se están actualizando
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer a medianoche para comparar solo fechas

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.amount !== undefined) updateData.amount = new Decimal(dto.amount);
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) {
      const dueDate = new Date(dto.dueDate);
      if (dueDate < today) {
        throw new BadRequestException('La fecha de vencimiento no puede ser anterior a la fecha actual');
      }
      updateData.dueDate = dueDate;
    }
    if (dto.reminderDate !== undefined) {
      if (dto.reminderDate) {
        const reminderDate = new Date(dto.reminderDate);
        if (reminderDate < today) {
          throw new BadRequestException('La fecha de recordatorio no puede ser anterior a la fecha actual');
        }
        updateData.reminderDate = reminderDate;
      } else {
        updateData.reminderDate = null;
      }
    }
    if (dto.isPaid !== undefined) {
      updateData.isPaid = dto.isPaid;
      if (dto.isPaid && !reminder.isPaid) {
        updateData.paidAt = new Date();
      } else if (!dto.isPaid) {
        updateData.paidAt = null;
      }
    }

    const updated = await this.prisma.paymentReminder.update({
      where: { id },
      data: updateData,
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            date: true,
          },
        },
      },
    });

    return updated;
  }

  async markAsPaid(id: string, userId: string, renew: boolean = false) {
    const reminder = await this.findOne(id, userId);

    if (reminder.isPaid) {
      throw new BadRequestException('Este recordatorio ya está marcado como pagado');
    }

    if (reminder.transactionId) {
      throw new BadRequestException('Ya existe una transacción para este recordatorio');
    }

    // Obtener la billetera personal por defecto del usuario
    const defaultWallet = await this.prisma.wallet.findFirst({
      where: {
        createdById: userId,
        type: 'PERSONAL',
        isDefault: true,
      },
    });

    if (!defaultWallet) {
      throw new NotFoundException('No se encontró tu billetera personal por defecto');
    }

    // Crear la transacción de gasto con la categoría del recordatorio
    const transaction = await this.transactionsService.create(userId, {
      walletId: defaultWallet.id,
      type: 'EXPENSE',
      amount: Number(reminder.amount),
      paidByUserId: userId,
      categoryId: reminder.categoryId,
      description: reminder.name, // El nombre del recordatorio como descripción
    });

    // Actualizar el recordatorio con la transacción y marcarlo como pagado
    const updated = await this.prisma.paymentReminder.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        transactionId: transaction.id,
      },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        transaction: {
          select: {
            id: true,
            amount: true,
            date: true,
          },
        },
      },
    });

    // Si se solicita renovación, crear un nuevo recordatorio para el próximo mes
    if (renew) {
      const currentDueDate = new Date(reminder.dueDate);
      const nextDueDate = new Date(currentDueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      await this.prisma.paymentReminder.create({
        data: {
          userId: reminder.userId,
          walletId: reminder.walletId,
          categoryId: reminder.categoryId,
          name: reminder.name,
          amount: reminder.amount,
          description: reminder.description,
          dueDate: nextDueDate,
          reminderDate: reminder.reminderDate ? (() => {
            const nextReminderDate = new Date(reminder.reminderDate);
            nextReminderDate.setMonth(nextReminderDate.getMonth() + 1);
            return nextReminderDate;
          })() : null,
        },
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const reminder = await this.findOne(id, userId);

    await this.prisma.paymentReminder.delete({
      where: { id },
    });

    return { message: 'Recordatorio eliminado correctamente' };
  }
}

