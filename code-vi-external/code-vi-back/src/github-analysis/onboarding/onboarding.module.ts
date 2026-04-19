import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { GithubModule } from '../github/github.module';
import { JenkinsModule } from '../jenkins/jenkins.module';

@Module({
  imports: [GithubModule, JenkinsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule { }
