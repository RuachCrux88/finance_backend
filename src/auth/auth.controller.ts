import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateOAuthLogin(profile: {
    provider: 'google';
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) {
    if (!profile.email)
      throw new UnauthorizedException('Google no entregó email.');

    // Usuario (upsert por email)
    const user = await this.prisma.user.upsert({
      where: { email: profile.email },
      update: { name: profile.name ?? undefined },
      create: { email: profile.email, name: profile.name ?? null },
    });

    // (opcional) Registrar cuenta de proveedor en tabla Account
    await this.prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.providerId,
        },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: profile.providerId,
      },
    });

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user };
  }

  setAuthCookie(res: Response, token: string) {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });
  }

  clearAuthCookie(res: Response) {
    res.clearCookie('token', { path: '/' });
  }
}

export class AuthController {
}