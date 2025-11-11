// src/auth/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    // Construir la URL del callback dinámicamente
    const getCallbackURL = () => {
      // Prioridad: API_BASE_URL > VERCEL_URL > NEXT_PUBLIC_API_BASE_URL > URL hardcodeada
      if (process.env.API_BASE_URL) {
        return `${process.env.API_BASE_URL}/auth/google/callback`;
      }
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/auth/google/callback`;
      }
      if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google/callback`;
      }
      // URL de producción hardcodeada como fallback
      return 'https://financebackend-ecru.vercel.app/auth/google/callback';
    };

    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: getCallbackURL(),
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    // Validar que el perfil tenga los datos necesarios
    if (!profile) {
      return done(new Error('No profile received from Google'), undefined);
    }

    const email = profile?.emails?.[0]?.value;
    const providerId = profile?.id;

    if (!email) {
      return done(new Error('No email found in Google profile'), undefined);
    }

    if (!providerId) {
      return done(new Error('No provider ID found in Google profile'), undefined);
    }

    // Pasamos el perfil al controller a través de req.user
    done(null, {
      email,
      name: profile?.displayName || profile?.name?.givenName || '',
      picture: profile?.photos?.[0]?.value,
      provider: 'google',
      providerId,
    });
  }
}
