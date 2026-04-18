import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { AuthService } from '../auth.service';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
    private readonly logger = new Logger(NaverStrategy.name);

    constructor(private readonly authService: AuthService) {
        super({
            clientID: process.env.NAVER_CLIENT_ID || '',
            clientSecret: process.env.NAVER_CLIENT_SECRET || '',
            callbackURL: process.env.NAVER_REDIRECT_URI || '',
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any) => void,
    ): Promise<any> {
        this.logger.debug('Getting Naver Profile');

        try {
            const naverId = profile?.id;
            const email = profile?.emails?.[0]?.value || profile?._json?.response?.email;
            const name =
                profile?.displayName ||
                profile?._json?.response?.name ||
                profile?._json?.response?.nickname ||
                email?.split('@')?.[0];

            if (!naverId) {
                throw new UnauthorizedException('Naver 계정 식별자(id)가 없습니다.');
            }

            if (!email) {
                throw new UnauthorizedException('Naver 계정에 이메일 정보가 없습니다.');
            }

            const user = await this.authService.findOrCreateNaverUser({
                naverUid: String(naverId),
                email,
                name: name || email.split('@')[0],
            });

            if (!user) {
                return done(null, false);
            }

            return done(null, user);
        } catch (error) {
            this.logger.error('Naver 로그인 검증 실패:', error);
            return done(error, false);
        }
    }
}