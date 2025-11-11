// src/auth/auth.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

interface GoogleUser {
  email: string;
  name?: string;
  providerId: string;
}

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async loginGoogle(userFromStrategy: GoogleUser) {
    if (!userFromStrategy?.email) {
      throw new BadRequestException('Google authentication failed: no email provided');
    }

    if (!userFromStrategy?.providerId) {
      throw new BadRequestException('Google authentication failed: no provider ID provided');
    }

    try {
      // Primero intentamos encontrar el usuario por googleId
      let user = await this.prisma.user.findUnique({
        where: { googleId: userFromStrategy.providerId },
      });

      // Si no existe por googleId, buscamos por email
      if (!user) {
        user = await this.prisma.user.findUnique({
          where: { email: userFromStrategy.email },
        });

        // Si existe por email pero no tiene googleId, actualizamos el googleId
        if (user && !user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { googleId: userFromStrategy.providerId },
          });
        }
      }

      // Si aún no existe, creamos el usuario
      if (!user) {
        // Generar código único para la billetera personal
        let inviteCode = randomBytes(4).toString('hex').toUpperCase();
        let exists = true;
        
        // Asegurar que el código sea único
        while (exists) {
          const existing = await this.prisma.wallet.findUnique({
            where: { inviteCode },
          });
          if (!existing) {
            exists = false;
          } else {
            inviteCode = randomBytes(4).toString('hex').toUpperCase();
          }
        }

        user = await this.prisma.user.create({
          data: {
            email: userFromStrategy.email,
            name: userFromStrategy.name ?? '',
            googleId: userFromStrategy.providerId,
            emailVerifiedAt: new Date(), // Google ya verificó el email
            // Crear automáticamente la billetera personal predefinida
            walletsOwned: {
              create: {
                name: 'Billetera personal',
                type: 'PERSONAL',
                currency: 'COP',
                inviteCode,
                isDefault: true, // Marcar como billetera predefinida
              },
            },
          },
        });
      }

      const payload = { sub: user.id, email: user.email };
      const token = await this.jwt.signAsync(payload, {
        secret: process.env.JWT_SECRET ?? 'dev-secret',
        expiresIn: '7d',
      });

      return token;
    } catch (error: any) {
      // Manejo de errores de Prisma (duplicados, etc.)
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new BadRequestException('User already exists with this email or Google ID');
      }
      throw new InternalServerErrorException('Failed to authenticate with Google');
    }
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    return user;
  }
}
