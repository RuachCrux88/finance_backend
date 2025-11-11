import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async createInvitation(userId: string, walletId: string, email: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: { members: true, createdBy: true },
    });

    if (!wallet) {
      throw new NotFoundException('Billetera no encontrada');
    }

    // Solo el dueño puede invitar
    const isOwner = wallet.createdById === userId || 
      wallet.members.some((m) => m.userId === userId && m.role === 'OWNER');
    
    if (!isOwner) {
      throw new ForbiddenException('Solo el dueño puede invitar miembros');
    }

    // Verificar que no sea billetera personal
    if (wallet.type !== 'GROUP') {
      throw new BadRequestException('Solo se pueden invitar miembros a billeteras grupales');
    }

    // Verificar que el usuario no sea ya miembro
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      const isAlreadyMember = wallet.members.some((m) => m.userId === existingUser.id);
      if (isAlreadyMember) {
        throw new BadRequestException('El usuario ya es miembro de esta billetera');
      }
    }

    // Verificar si ya existe una invitación pendiente
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        walletId,
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('Ya existe una invitación pendiente para este usuario');
    }

    // Crear nueva invitación
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

    const invitation = await this.prisma.invitation.create({
      data: {
        walletId,
        email: email.toLowerCase(),
        token,
        status: 'PENDING',
        expiresAt,
        invitedByUserId: userId,
      },
    });

    // Enviar email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/invitations/accept?token=${token}`;
    
    await this.mailer.sendInvitationEmail(
      email,
      wallet.name,
      wallet.createdBy.name || wallet.createdBy.email,
      acceptUrl,
    );

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { wallet: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Esta invitación ya fue procesada');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    // Verificar que el email coincida con el usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('Esta invitación no es para tu cuenta');
    }

    // Agregar como miembro
    await this.prisma.walletMember.create({
      data: {
        walletId: invitation.walletId,
        userId,
        role: 'MEMBER',
      },
    });

    // Actualizar estado de invitación
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    return { success: true, walletId: invitation.walletId };
  }

  async getPendingInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.invitation.findMany({
      where: {
        email: user.email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        wallet: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

