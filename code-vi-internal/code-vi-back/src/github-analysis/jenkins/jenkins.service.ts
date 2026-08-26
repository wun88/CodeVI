import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

/** axios 에러에서 HTTP 상태코드를 꺼낸다 — axios 외 예외면 undefined. */
function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** XML 텍스트 노드에 안전하게 넣기 위한 이스케이프 — 자격증명 값/URL에 특수문자가 올 수 있다. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class JenkinsService {
  private readonly logger = new Logger(JenkinsService.name);
  private readonly jenkinsUrl =
    process.env.JENKINS_URL || 'http://jenkins:9002';
  private readonly jenkinsUser = process.env.JENKINS_USER || 'admin';
  private readonly jenkinsToken = process.env.JENKINS_TOKEN || 'admin_token';

  /**
   * 사용자별 GitHub OAuth 토큰을 Jenkins 자격증명으로 등록/갱신한다.
   * 공용 관리자 PAT(github-credentials)는 다른 사용자의 private 저장소를 클론할 수 없으므로,
   * 저장소를 연결한 사용자의 토큰(repo scope)을 그 사용자 전용 credential로 승격시켜
   * 파이프라인 체크아웃에 사용한다. 재연결/재분석 때마다 최신 토큰으로 덮어쓴다.
   */
  async ensureUserCredential(
    credentialId: string,
    githubUsername: string,
    oauthToken: string,
  ): Promise<void> {
    const auth = Buffer.from(
      `${this.jenkinsUser}:${this.jenkinsToken}`,
    ).toString('base64');
    const csrfHeaders = await this.getCsrfHeaders(auth);
    const xml = this.generateCredentialXml(
      credentialId,
      githubUsername,
      oauthToken,
    );
    const store = `${this.jenkinsUrl}/credentials/store/system/domain/_`;
    const headers = {
      'Content-Type': 'application/xml',
      Authorization: `Basic ${auth}`,
      ...csrfHeaders,
    };

    try {
      await axios.post(
        `${store}/credential/${encodeURIComponent(credentialId)}/config.xml`,
        xml,
        { headers },
      );
      this.logger.log(`Updated Jenkins credential: ${credentialId}`);
    } catch (error: unknown) {
      if (httpStatus(error) !== 404) {
        this.logger.error(
          `Jenkins credential update error: ${errorMessage(error)}`,
        );
        throw new BadRequestException(
          `Jenkins credential 갱신 실패: ${errorMessage(error)}`,
        );
      }
      try {
        await axios.post(`${store}/createCredentials`, xml, { headers });
        this.logger.log(`Created Jenkins credential: ${credentialId}`);
      } catch (createError: unknown) {
        this.logger.error(
          `Jenkins credential creation error: ${errorMessage(createError)}`,
        );
        throw new BadRequestException(
          `Jenkins credential 생성 실패: ${errorMessage(createError)}`,
        );
      }
    }
  }

  async createPipelineJob(
    jobName: string,
    repoUrl: string,
    credentialsId = 'github-credentials',
  ): Promise<void> {
    const auth = Buffer.from(
      `${this.jenkinsUser}:${this.jenkinsToken}`,
    ).toString('base64');
    const configXml = this.generatePipelineConfigXml(repoUrl, credentialsId);
    const csrfHeaders = await this.getCsrfHeaders(auth);
    const xmlHeaders = {
      'Content-Type': 'application/xml',
      Authorization: `Basic ${auth}`,
      ...csrfHeaders,
    };

    try {
      this.logger.log(`Attempting to create Jenkins Job: ${jobName}`);
      await axios.post(
        `${this.jenkinsUrl}/createItem?name=${encodeURIComponent(jobName)}`,
        configXml,
        { headers: xmlHeaders },
      );
      this.logger.log(`Successfully created new Jenkins Job: ${jobName}`);
    } catch (error: unknown) {
      if (httpStatus(error) === 400) {
        // 이미 있는 잡이면 config를 덮어쓴다 — 자격증명 교체(공용 PAT → 사용자 토큰)나
        // 저장소 URL 변경이 기존 잡에도 반영되어야 재분석이 성공한다.
        try {
          await axios.post(
            `${this.jenkinsUrl}/job/${encodeURIComponent(jobName)}/config.xml`,
            configXml,
            { headers: xmlHeaders },
          );
          this.logger.log(
            `Jenkins Job already exists: ${jobName}. Updated its config instead.`,
          );
        } catch (updateError: unknown) {
          this.logger.error(
            `Jenkins job config update error: ${errorMessage(updateError)}`,
          );
          throw new BadRequestException(
            `Jenkins Job 설정 갱신 실패: ${errorMessage(updateError)}`,
          );
        }
      } else {
        this.logger.error(`Jenkins Creation Error: ${errorMessage(error)}`);
        throw new BadRequestException(
          `Jenkins Integration Failed: ${errorMessage(error)}`,
        );
      }
    }

    // Always trigger build after creation or skip
    try {
      this.logger.log(`Triggering build for Jenkins Job: ${jobName}`);
      await axios.post(
        `${this.jenkinsUrl}/job/${encodeURIComponent(jobName)}/build`,
        {},
        { headers: { Authorization: `Basic ${auth}`, ...csrfHeaders } },
      );
    } catch (error: unknown) {
      this.logger.error(`Jenkins Build Trigger Error: ${errorMessage(error)}`);
      throw new BadRequestException(
        `Failed to trigger Jenkins build: ${errorMessage(error)}`,
      );
    }
  }

  // Jenkins는 crumb 없는 POST를 403으로 거부한다. crumb는 발급받은 세션 쿠키와 짝이 맞아야
  // 유효하므로(Set-Cookie를 안 넘기면 crumb만 보내도 403), 둘 다 이후 요청에 실어 보낸다.
  private async getCsrfHeaders(
    basicAuth: string,
  ): Promise<Record<string, string>> {
    try {
      const res = await axios.get<{ crumbRequestField: string; crumb: string }>(
        `${this.jenkinsUrl}/crumbIssuer/api/json`,
        { headers: { Authorization: `Basic ${basicAuth}` } },
      );
      const headers: Record<string, string> = {
        [res.data.crumbRequestField]: res.data.crumb,
      };
      const setCookie = res.headers['set-cookie'];
      if (setCookie?.length) {
        headers['Cookie'] = setCookie
          .map((c: string) => c.split(';')[0])
          .join('; ');
      }
      return headers;
    } catch (error: unknown) {
      // crumb 발급 자체가 꺼져있는 Jenkins 설정일 수도 있으니, 못 받아와도 요청은 계속 시도한다.
      this.logger.warn(
        `Failed to fetch Jenkins crumb (continuing without it): ${errorMessage(error)}`,
      );
      return {};
    }
  }

  private generateCredentialXml(
    credentialId: string,
    githubUsername: string,
    oauthToken: string,
  ): string {
    return `<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>${escapeXml(credentialId)}</id>
  <username>${escapeXml(githubUsername)}</username>
  <password>${escapeXml(oauthToken)}</password>
  <description>GitHub OAuth token (CodeVi가 저장소 연결 시 자동 관리 — 수동 수정 금지)</description>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>`;
  }

  private generatePipelineConfigXml(
    repoUrl: string,
    credentialsId: string,
  ): string {
    return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${escapeXml(repoUrl)}</url>
          <credentialsId>${escapeXml(credentialsId)}</credentialsId>
        </hudson.plugins.git.UserRemoteConfig>
      </userRemoteConfigs>
      <branches>
        <hudson.plugins.git.BranchSpec><name>*/main</name></hudson.plugins.git.BranchSpec>
        <hudson.plugins.git.BranchSpec><name>*/master</name></hudson.plugins.git.BranchSpec>
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
</flow-definition>`;
  }
}
