import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userAgent = request.headers['user-agent'] || '';
    const isKakaoTalk = userAgent.toLowerCase().includes('kakaotalk');

    return {
      prompt: isKakaoTalk ? 'none' : 'select_account',
      scope: ['account_email', 'profile_nickname'],
    };
  }
}
