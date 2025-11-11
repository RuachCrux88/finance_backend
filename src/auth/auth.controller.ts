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
    try {
      // req.user viene del GoogleStrategy
      if (!req.user) {
        return res.redirect(
          `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/login?error=no_user`,
        );
      }

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
    } catch (error: any) {
      // Redirigir al frontend con un error
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const errorMessage = encodeURIComponent(
        error.message || 'Authentication failed',
      );
      res.redirect(`${frontendUrl}/login?error=${errorMessage}`);
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: Request) {
    // payload validado por JwtStrategy
    const userInfo = req.user as { id: string; email: string };
    // Obtenemos el usuario completo de la base de datos para incluir el nombre
    const fullUser = await this.auth.getUserById(userInfo.id);
    return fullUser || userInfo;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { path: '/' });
    return { ok: true };
  }
}
