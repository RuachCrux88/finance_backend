// src/auth/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
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
