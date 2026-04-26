import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    // [3] JWT 토큰 추출
    super({
      secretOrKey: process.env.JWT_SECRET || 'secret', // 검증하기 위한 Secret Key
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Authorization 헤더에서 JWT 추출
    });
  } // [4] Secret Key로 검증 - 해당 인스턴스가 생성되는 시점 자체가 검증과정

  // [5] JWT에서 사용자 정보 가져오기
  async validate(payload) {
    const { email } = payload;

    const user: User = await this.usersService.getUserByEmail(email);
    console.log(user.id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
