import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { AuthService } from '../auth/auth.service';
import { GithubService } from '../github-analysis/github/github.service';
import { JenkinsService } from '../github-analysis/jenkins/jenkins.service';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { User } from '../users/entities/user.entity';
import { RepositorySummaryDto } from './dto/repository-summary.dto';
import { RegisterProjectRequestDto } from './dto/register-project-request.dto';

// passport-github2는 실제 승인된 scope가 아니라 GithubStrategy 생성자의 고정 scope로
// 이메일 조회 가능 여부를 판단한다(user:email 포함 여부만 봄). 콜백을 로그인과 공유하는 이상
// user:email을 빼면 "Failed to fetch user emails"로 콜백이 500 난다.
const GITHUB_CONNECT_SCOPE = 'repo read:user user:email';

@Injectable()
export class GithubConnectService {
  private readonly logger = new Logger(GithubConnectService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly githubService: GithubService,
    private readonly jenkinsService: JenkinsService,
    private readonly dataSource: DataSource,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * `window.location.href` 풀 리다이렉트로는 Authorization 헤더를 실어 보낼 수 없으므로,
   * 프론트가 로그인 JWT를 쿼리스트링(`?token=`)으로 전달한다 — 기존 로그인 콜백이
   * `?jwtToken=...`을 쿼리스트링으로 넘기는 것과 동일한 관례.
   */
  buildAuthorizeRedirectUrl(rawLoginToken: string): string {
    let userId: number;
    try {
      const payload = this.jwtService.verify<{ id?: number }>(rawLoginToken);
      if (!payload?.id) throw new Error('id missing');
      userId = payload.id;
    } catch {
      throw new UnauthorizedException('유효하지 않은 로그인 토큰입니다.');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      throw new HttpException(
        'GITHUB_CLIENT_ID/GITHUB_REDIRECT_URI가 설정되지 않았습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const state = this.authService.signGithubConnectState(userId);
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', GITHUB_CONNECT_SCOPE);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async getConnectionStatus(userId: number): Promise<{ connected: boolean; githubUsername: string | null }> {
    const connection = await this.authService.getGithubConnection(userId);
    return {
      connected: !!connection,
      githubUsername: connection?.githubUsername ?? null,
    };
  }

  async listRepositories(userId: number): Promise<RepositorySummaryDto[]> {
    const token = await this.authService.getDecryptedGithubToken(userId);
    const octokit = new Octokit({ auth: token });

    try {
      const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        sort: 'updated',
      });
      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        description: repo.description ?? null,
        language: repo.language ?? null,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at ?? repo.pushed_at ?? '',
        htmlUrl: repo.html_url,
        stargazersCount: repo.stargazers_count ?? 0,
      }));
    } catch (error: any) {
      if (error?.status === 401) {
        throw new HttpException(
          'GitHub 인증이 만료되었습니다. 다시 연결해주세요.',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      if (error?.status === 403 && error?.response?.headers?.['x-ratelimit-remaining'] === '0') {
        throw new HttpException('GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.error(`Failed to list GitHub repositories: ${error?.message}`);
      throw new HttpException('GitHub 저장소 목록을 가져오지 못했습니다.', HttpStatus.FAILED_DEPENDENCY);
    }
  }

  async registerProject(
    userId: number,
    dto: RegisterProjectRequestDto,
  ): Promise<{ teamProjectId: number; jenkinsJobName: string; githubRepoFullName: string }> {
    const token = await this.authService.getDecryptedGithubToken(userId);
    const octokit = new Octokit({ auth: token });
    const { owner, repo } = dto;

    let defaultBranch = 'main';
    try {
      const { data } = await octokit.repos.get({ owner, repo });
      defaultBranch = data.default_branch;
    } catch (error: any) {
      if (error?.status === 404) throw new NotFoundException('해당 저장소를 찾을 수 없습니다.');
      if (error?.status === 403) throw new ForbiddenException('선택한 저장소에 접근할 수 없습니다.');
      throw new HttpException('GitHub 저장소 확인에 실패했습니다.', HttpStatus.FAILED_DEPENDENCY);
    }

    const jenkinsJobName = `${owner}-${repo}`.toLowerCase();
    const githubRepoFullName = `${owner}/${repo}`;

    const existing = await this.teamProjectRepository.findOne({ where: { JenkinsJobName: jenkinsJobName } });
    if (existing) {
      throw new ConflictException({
        message: '이미 등록된 프로젝트입니다.',
        teamProjectId: existing.id,
      });
    }

    const repoUrl = `https://github.com/${owner}/${repo}`;
    // Jenkinsfile 주입 + Jenkins Job 생성이 실패하면 TeamProject를 남기지 않는다(부분 등록 방지).
    await this.githubService.injectJenkinsfileWithToken(token, repoUrl);
    await this.jenkinsService.createPipelineJob(jenkinsJobName, repoUrl);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const saved = await this.dataSource.transaction(async (manager) => {
      const project = manager.create(TeamProject, {
        teamName: dto.teamName || repo,
        JenkinsJobName: jenkinsJobName,
        sonarProjectKey: jenkinsJobName,
        githubRepoFullName,
        githubDefaultBranch: defaultBranch,
        users: [user],
      });
      return manager.save(project);
    });

    return {
      teamProjectId: saved.id,
      jenkinsJobName,
      githubRepoFullName,
    };
  }

  async disconnect(userId: number): Promise<void> {
    const connection = await this.authService.getGithubConnection(userId);
    if (!connection) {
      throw new ConflictException('GitHub 계정이 연결되어 있지 않습니다.');
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (clientId && clientSecret) {
      try {
        const token = await this.authService.getDecryptedGithubToken(userId);
        await axios.delete(`https://api.github.com/applications/${clientId}/grant`, {
          auth: { username: clientId, password: clientSecret },
          data: { access_token: token },
          headers: { Accept: 'application/vnd.github+json' },
        });
      } catch (error: any) {
        // 로컬 연결 해제는 GitHub 측 revoke 실패와 무관하게 진행한다(사용자 경험상 "연결 안 됨"이 우선).
        this.logger.warn(`GitHub grant revoke failed (continuing local disconnect): ${error?.message}`);
      }
    }

    await this.authService.deleteGithubConnection(userId);
  }
}
