import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { Profile } from 'passport';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  // 두 번째 인자는 전략 이름
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID, // Google 클라이언트 ID
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Google 클라이언트 시크릿
      callbackURL: process.env.GOOGLE_REDIRECT_URI, // Google 리디렉션 URI (백엔드)
      scope: ['profile', 'email'], // 요청할 사용자 정보 범위
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    this.logger.debug('Getting Google Profile');

    try {
      const { emails, displayName } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        throw new UnauthorizedException(
          'Google 계정에 이메일 정보가 없습니다.',
        );
      }

      // AuthService의 signInWithGoogle 메서드를 활용하여 사용자 조회 또는 생성
      const user = await this.authService.findOrCreateGoogleUser({
        email,
        name: displayName,
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user); // request.user에 저장될 사용자 객체
    } catch (error) {
      this.logger.error('Google 로그인 검증 실패:', error);
      return done(error, false);
    }
  }
}
