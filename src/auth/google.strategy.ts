import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:4000/auth/google/redirect',
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: Profile) {
    const { id, displayName, emails, photos } = profile;
    return {
      provider: 'google',
      providerId: id,
      email: emails?.[0]?.value,
      name: displayName,
      avatar: photos?.[0]?.value,
    };
  }
}
