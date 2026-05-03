import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_REDIRECT_URI || '',
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    this.logger.debug('Getting Google Profile');

    try {
      const googleId = profile.id;
      const { emails, displayName, name } = profile;
      const email = emails?.[0]?.value;

      if (!googleId) {
        throw new UnauthorizedException('Google 계정 식별자(id)가 없습니다.');
      }

      if (!email) {
        throw new UnauthorizedException('Google 계정에 이메일 정보가 없습니다.');
      }

      const user = await this.authService.findOrCreateGoogleUser({
        googleUid: String(googleId),
        email,
        name: displayName || name?.givenName || email.split('@')[0],
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      this.logger.error('Google 로그인 검증 실패:', error);
      return done(error, false);
    }
  }
}
