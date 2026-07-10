import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiKeyService } from '../../api-key/api-key.service';
import { UsersService } from '../../users/users.service';

/**
 * smell-analysis 전용 JwtOrApiKeyGuard.
 * metric-analysis의 guard와 동일한 로직을 사용한다.
 */
@Injectable()
export class SmellAnalysisJwtOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, credential] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !credential) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    if (credential.startsWith('cv_live_')) {
      const apiKey = await this.apiKeyService.validateKey(credential);
      await this.apiKeyService.touchLastUsedAt(apiKey.id);
      request.apiKey = apiKey;
      return true;
    }

    const payload = await this.jwtService.verifyAsync(credential, {
      secret: process.env.JWT_SECRET || 'default-secret-key',
    });
    const user = await this.usersService.getUserByEmail(payload.email);

    request.user = user;
    return true;
  }
}
