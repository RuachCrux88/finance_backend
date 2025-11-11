// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { Request } from 'express';

const cookieExtractor = (req: Request): string | null => {
  if (req?.cookies?.token) return String(req.cookies.token);
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    // Lo que pongas aquí es lo que queda en req.user
    return { id: payload.sub, email: payload.email };
  }
}

