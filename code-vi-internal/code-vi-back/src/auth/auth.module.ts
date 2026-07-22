import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { GithubConnection } from '../github-connect/entities/github-connection.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { RolesGuard } from './custom-guards-decorators/roles.guard';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleAuthGuard } from './custom-guards-decorators/google-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubAuthGuard } from './custom-guards-decorators/github-auth.guard';
import { GithubStrategy } from './strategies/github.strategy';
import { KakaoAuthGuard } from './custom-guards-decorators/kakao-auth.guard';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { NaverAuthGuard } from './custom-guards-decorators/naver-auth.guard';
import { NaverStrategy } from './strategies/naver.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, GithubConnection]),
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key', // 기본값 제공
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION') || '1h' as any,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    GoogleAuthGuard,
    GoogleStrategy,
    GithubAuthGuard,
    GithubStrategy,
    KakaoAuthGuard,
    KakaoStrategy,
    NaverAuthGuard,
    NaverStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, PassportModule, RolesGuard, JwtModule],
})
export class AuthModule { }
