import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, GoogleStrategy, JwtStrategy, PrismaService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
