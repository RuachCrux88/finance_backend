// src/auth/auth.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

// Función para generar código único de 10 caracteres alfanuméricos
function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

interface GoogleUser {
  email: string;
  name?: string;
  providerId: string;
  accessToken?: string;
  refreshToken?: string;
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
      // Buscar cuenta de Google OAuth en Account
      const account = await this.prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: userFromStrategy.providerId,
          },
        },
        include: { user: true },
      });

      let user = account?.user ?? null;

      // Si no existe la cuenta, buscamos usuario por email
      if (!user) {
        const userByEmail = await this.prisma.user.findUnique({
          where: { email: userFromStrategy.email },
          include: { accounts: true },
        });
        user = userByEmail;
      }

      // Si aún no existe, creamos el usuario y su cuenta de Google
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

        // Generar código único de usuario
        let userCode = generateUserCode();
        let codeExists = true;
        
        // Asegurar que el código sea único
        while (codeExists) {
          const existing = await this.prisma.user.findUnique({
            where: { userCode },
          });
          if (!existing) {
            codeExists = false;
          } else {
            userCode = generateUserCode();
          }
        }

        user = await this.prisma.user.create({
          data: {
            email: userFromStrategy.email,
            name: userFromStrategy.name ?? '',
            userCode,
            emailVerifiedAt: new Date(), // Google ya verificó el email
            // Crear la cuenta de Google OAuth
            accounts: {
              create: {
                type: 'oauth',
                provider: 'google',
                providerAccountId: userFromStrategy.providerId,
                access_token: userFromStrategy.accessToken,
                refresh_token: userFromStrategy.refreshToken,
                expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hora por defecto
                token_type: 'Bearer',
                scope: 'openid profile email',
              },
            },
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
      } else {
        // Si el usuario existe pero no tiene cuenta de Google, la creamos
        // Verificar si el usuario ya tiene una cuenta de Google (puede haber sido creada antes)
        // Necesitamos recargar el usuario con sus cuentas si no las tenemos
        const userWithAccounts = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: { accounts: true },
        });
        
        const existingGoogleAccount = userWithAccounts?.accounts?.find(
          (acc) => acc.provider === 'google' && acc.providerAccountId === userFromStrategy.providerId,
        );

        if (!account && !existingGoogleAccount) {
          // Crear la cuenta de Google OAuth
          await this.prisma.account.create({
            data: {
              userId: user.id,
              type: 'oauth',
              provider: 'google',
              providerAccountId: userFromStrategy.providerId,
              access_token: userFromStrategy.accessToken,
              refresh_token: userFromStrategy.refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hora por defecto
              token_type: 'Bearer',
              scope: 'openid profile email',
            },
          });
        } else if (account || existingGoogleAccount) {
          // Actualizar tokens si la cuenta ya existe
          const accountToUpdate = account || existingGoogleAccount;
          if (accountToUpdate) {
            await this.prisma.account.update({
              where: {
                id: accountToUpdate.id,
              },
              data: {
                access_token: userFromStrategy.accessToken,
                refresh_token: userFromStrategy.refreshToken,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            });
          }
        }

        // Actualizar nombre si está vacío o si viene de Google
        if (!user.name && userFromStrategy.name) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { name: userFromStrategy.name },
          });
        }
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
        throw new BadRequestException('User already exists with this email or Google account');
      }
      throw new InternalServerErrorException('Failed to authenticate with Google');
    }
  }

  async getUserById(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        userCode: true,
      },
    });

    // Si el usuario no tiene código, generarlo
    if (user && (!user.userCode || user.userCode === '')) {
      let userCode = generateUserCode();
      let codeExists = true;
      
      while (codeExists) {
        const existing = await this.prisma.user.findUnique({
          where: { userCode },
        });
        if (!existing) {
          codeExists = false;
        } else {
          userCode = generateUserCode();
        }
      }
      
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { userCode },
        select: {
          id: true,
          email: true,
          name: true,
          userCode: true,
        },
      });
    }

    return user;
  }

  async getUserByCode(userCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { userCode },
      select: {
        id: true,
        email: true,
        name: true,
        userCode: true,
      },
    });
    return user;
  }
}
