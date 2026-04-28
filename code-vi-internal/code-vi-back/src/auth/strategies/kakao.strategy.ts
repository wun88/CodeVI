import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { AuthService } from '../auth.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  private readonly logger = new Logger(KakaoStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '', // 카카오에서 보안 강화를 위해 권장하지만 필수는 아님
      callbackURL: process.env.KAKAO_REDIRECT_URI || '',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    this.logger.debug('Getting Kakao Profile');

    try {
      const { id: kakaoId, kakao_account, properties } = profile;
      const email = kakao_account?.email;
      const nickname = properties?.nickname;

      // 이메일이 없는 경우 처리
      if (!email) {
        console.warn(`Kakao login: No email found for user ${kakaoId}. Proceeding with nickname.`);
      }

      const user = await this.authService.findOrCreateKakaoUser({
        kakaoUid: parseInt(kakaoId, 10),
        email,
        name: nickname || (email ? email.split('@')[0] : `kakao_${kakaoId}`),
      });

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      this.logger.error('Kakao 로그인 검증 실패:', error);
      return done(error, false);
    }
  }
}
