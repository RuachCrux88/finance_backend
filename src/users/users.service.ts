import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          walletsOwned: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Usar transacción para asegurar que todo se elimine correctamente
      await this.prisma.$transaction(async (tx) => {
        // 1. Manejar billeteras del usuario antes de eliminarlo
        for (const wallet of user.walletsOwned) {
          if (wallet.type === 'GROUP') {
            // Para billeteras grupales: transferir propiedad a otro miembro
            const anyMember = await tx.walletMember.findFirst({
              where: {
                walletId: wallet.id,
                userId: { not: userId },
              },
            });
            
            if (anyMember) {
              // Transferir propiedad al miembro encontrado
              await tx.walletMember.update({
                where: { id: anyMember.id },
                data: { role: 'OWNER' },
              });
              
              await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                  createdById: anyMember.userId,
                },
              });
            } else {
              // Si no hay miembros, eliminar la billetera (se eliminarán en cascada las transacciones, etc.)
              await tx.wallet.delete({
                where: { id: wallet.id },
              });
            }
          } else {
            // Para billeteras personales: eliminar la billetera
            await tx.wallet.delete({
              where: { id: wallet.id },
            });
          }
        }

        // 2. Eliminar relaciones que no tienen onDelete: Cascade
        // Eliminar transacciones donde el usuario es creador o pagador
        await tx.transaction.deleteMany({
          where: {
            OR: [
              { createdById: userId },
              { paidByUserId: userId },
            ],
          },
        });

        // Eliminar splits donde el usuario debe dinero
        await tx.transactionSplit.deleteMany({
          where: { owedByUserId: userId },
        });

        // Eliminar settlements relacionados con el usuario
        await tx.settlement.deleteMany({
          where: {
            OR: [
              { createdById: userId },
              { fromUserId: userId },
              { toUserId: userId },
            ],
          },
        });

        // Eliminar goal progress creado por el usuario
        await tx.goalProgress.deleteMany({
          where: { createdById: userId },
        });

        // Eliminar goals creados por el usuario
        await tx.goal.deleteMany({
          where: { createdById: userId },
        });

        // Eliminar invitaciones enviadas por el usuario
        await tx.invitation.deleteMany({
          where: { invitedByUserId: userId },
        });

        // Establecer null en categorías creadas por el usuario (si es posible)
        await tx.category.updateMany({
          where: { createdById: userId },
          data: { createdById: null },
        });

        // 3. Eliminar el usuario (Prisma eliminará en cascada WalletMember, Account, Session)
        await tx.user.delete({
          where: { id: userId },
        });
      });

      return { success: true, message: 'Cuenta eliminada exitosamente' };
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `Error al eliminar la cuenta: ${errorMessage}`,
      );
    }
  }
}
