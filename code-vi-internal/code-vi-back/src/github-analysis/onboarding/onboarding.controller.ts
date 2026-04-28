import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('/')
  async startOnboarding(
    @Body('encryptedPat') encryptedPat: string,
    @Body('repoUrl') repoUrl: string,
  ) {
    return await this.onboardingService.onboardUserProject(encryptedPat, repoUrl);
  }
}
