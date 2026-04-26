import { Injectable, Logger } from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { JenkinsService } from '../jenkins/jenkins.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly jenkinsService: JenkinsService,
  ) { }

  async onboardUserProject(encryptedPat: string, repoUrl: string): Promise<any> {
    this.logger.log(`Onboarding repository: ${repoUrl}`);
    await this.githubService.injectJenkinsfile(encryptedPat, repoUrl);

    const jobName = this.deriveJobNameFromUrl(repoUrl);
    await this.jenkinsService.createPipelineJob(jobName, repoUrl);

    return { status: 'success', jobName, repoUrl };
  }

  private deriveJobNameFromUrl(url: string): string {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (!match) return `job-${Date.now()}`;
    return `${match[1]}-${match[2].replace('.git', '')}`.toLowerCase();
  }
}
