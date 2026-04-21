import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly authService: AuthService) { }

  async injectJenkinsfile(encryptedPat: string, repoUrl: string): Promise<void> {
    const pat = this.authService.decryptText(encryptedPat);
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const octokit = new Octokit({ auth: pat });

    try {
      this.logger.log(`Checking Jenkinsfile in ${owner}/${repo}`);
      try {
        await octokit.repos.getContent({ owner, repo, path: 'Jenkinsfile' });
        this.logger.log('Jenkinsfile already exists.');
        return;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      this.logger.log(`Injecting Jenkinsfile into ${owner}/${repo}`);
      const content = Buffer.from(this.getJenkinsfileTemplate()).toString('base64');
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'Jenkinsfile',
        message: 'chore: add Jenkinsfile for code analysis',
        content,
      });
      this.logger.log('Jenkinsfile injected successfully.');
    } catch (error) {
      if (error.status === 403) {
        throw new BadRequestException(
          'PAT에 레포지토리 쓰기 권한이 없습니다. GitHub에서 PAT를 재발급하고 "repo" 스코프(또는 fine-grained token의 경우 Contents: Read & Write)를 허용해주세요.',
        );
      }
      throw new BadRequestException(`GitHub Error: ${error.message}`);
    }
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (!match) throw new BadRequestException('Invalid GitHub repository URL');
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }

  private getJenkinsfileTemplate(): string {
    return `pipeline {
    agent any
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Analysis') { steps { echo 'Performing code analysis...' } }
    }
}`;
  }
}
