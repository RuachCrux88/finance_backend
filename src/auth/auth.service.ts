// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async loginGoogle(userFromStrategy: { email: string; name?: string }) {
    if (!userFromStrategy?.email) throw new Error('Google sin email');

    let user = await this.prisma.user.findUnique({
      where: { email: userFromStrategy.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userFromStrategy.email,
          name: userFromStrategy.name ?? '',
        },
      });
    }

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      expiresIn: '7d',
    });

    return token;
  }
}
