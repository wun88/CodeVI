import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: process.env.GITHUB_REDIRECT_URI || '',
      scope: ['user:email', 'read:user'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    this.logger.debug('Getting GitHub Profile');

    try {
      const { id: githubId, emails, displayName, username } = profile;
      const email = emails?.[0]?.value;

      if (!email) {
        throw new UnauthorizedException(
          'GitHub 계정에 이메일 정보가 없습니다. GitHub 설정에서 이메일을 공개로 설정해주세요.',
        );
      }

      const user = await this.authService.findOrCreateGithubUser({
        githubUid: parseInt(githubId, 10),
        email,
        name: displayName || username || email.split('@')[0],
      });

      if (!user) {
        return done(null, false);
      }

      // repo scope 연동(GET /api/github/connect) 콜백에서만 사용 — 로그인 전용 흐름은 이 값을 무시한다.
      // DB에는 저장하지 않고 이번 요청(req.user)에만 임시로 실어 보낸다.
      (user as User & { _githubAccessToken?: string })._githubAccessToken = accessToken;
      (user as User & { _githubUsername?: string })._githubUsername = username;

      return done(null, user);
    } catch (error) {
      this.logger.error('GitHub 로그인 검증 실패:', error);
      return done(error, false);
    }
  }
}
