// src/auth/auth.controller.ts
import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    // Passport redirige a Google. Nada que hacer aquí.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // req.user viene del GoogleStrategy
    const token = await this.auth.loginGoogle(req.user as any);

    // Seteamos cookie httpOnly con el JWT
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // en prod: true + HTTPS
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
    });

    res.redirect(process.env.FRONTEND_URL ?? 'http://localhost:3000');
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: Request) {
    // payload validado por JwtStrategy
    return req.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { path: '/' });
    return { ok: true };
  }
}
