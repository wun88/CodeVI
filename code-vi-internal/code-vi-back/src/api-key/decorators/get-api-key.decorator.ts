import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKey } from '../entities/api-key.entity';

export const GetApiKey = createParamDecorator(
  (data, ctx: ExecutionContext): ApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);
