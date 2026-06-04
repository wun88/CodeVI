import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Authorization 헤더의 Bearer API Key를 검증하고 request 객체에 주입합니다.
   */
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

    const validatedApiKey = await this.apiKeyService.validateKey(credential);
    await this.apiKeyService.touchLastUsedAt(validatedApiKey.id);

    request.apiKey = validatedApiKey;
    return true;
  }
}
