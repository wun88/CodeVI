import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

interface JwtPayload {
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    configService: ConfigService,
  ) {
    // auth.module.ts의 JwtModule.registerAsync와 동일한 기본값을 써야 한다 — 서명(sign)과 검증
    // (verify)이 서로 다른 기본값을 쓰면 JWT_SECRET 환경변수가 없을 때 모든 인증이 조용히 깨진다.
    super({
      secretOrKey:
        configService.get<string>('JWT_SECRET') || 'default-secret-key',
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    // getUserByEmail은 사용자가 없으면 NotFoundException을 던진다 — 토큰은 유효한데 그 사이
    // 탈퇴/삭제된 사용자인 경우까지 401(인증 실패)로 통일하기 위해 여기서 잡아 변환한다.
    try {
      return await this.usersService.getUserByEmail(payload.email);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
