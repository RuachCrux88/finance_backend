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
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/login?error=no_user`);
      }

      const token = await this.auth.loginGoogle(req.user as any);

      // Seteamos cookie httpOnly con el JWT
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: isProduction ? 'none' : 'lax', // 'none' es necesario para cross-origin en producción
        secure: isProduction, // true en producción con HTTPS (requerido para sameSite: 'none')
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
        // No especificar domain para que funcione cross-origin
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(frontendUrl);
    } catch (error: unknown) {
      // Redirigir al frontend con un error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Authentication failed';
      const errorMessage = encodeURIComponent(message);
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
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', { 
      path: '/',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction
    });
    return { ok: true };
  }
}