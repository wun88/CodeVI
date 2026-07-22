import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class JenkinsService {
  private readonly logger = new Logger(JenkinsService.name);
  private readonly jenkinsUrl = process.env.JENKINS_URL || 'http://jenkins:9002';
  private readonly jenkinsUser = process.env.JENKINS_USER || 'admin';
  private readonly jenkinsToken = process.env.JENKINS_TOKEN || 'admin_token';

  async createPipelineJob(jobName: string, repoUrl: string): Promise<void> {
    const auth = Buffer.from(`${this.jenkinsUser}:${this.jenkinsToken}`).toString('base64');
    const configXml = this.generatePipelineConfigXml(repoUrl);
    const csrfHeaders = await this.getCsrfHeaders(auth);

    try {
      this.logger.log(`Attempting to create Jenkins Job: ${jobName}`);
      await axios.post(
        `${this.jenkinsUrl}/createItem?name=${encodeURIComponent(jobName)}`,
        configXml,
        {
          headers: { 'Content-Type': 'application/xml', 'Authorization': `Basic ${auth}`, ...csrfHeaders },
        }
      );
      this.logger.log(`Successfully created new Jenkins Job: ${jobName}`);
    } catch (error: any) {
      if (error.response?.status === 400) {
        this.logger.warn(`Jenkins Job already exists: ${jobName}. Skipping creation.`);
      } else {
        this.logger.error(`Jenkins Creation Error: ${error.message}`);
        throw new BadRequestException(`Jenkins Integration Failed: ${error.message}`);
      }
    }

    // Always trigger build after creation or skip
    try {
      this.logger.log(`Triggering build for Jenkins Job: ${jobName}`);
      await axios.post(
        `${this.jenkinsUrl}/job/${encodeURIComponent(jobName)}/build`,
        {},
        { headers: { 'Authorization': `Basic ${auth}`, ...csrfHeaders } }
      );
    } catch (error: any) {
      this.logger.error(`Jenkins Build Trigger Error: ${error.message}`);
      throw new BadRequestException(`Failed to trigger Jenkins build: ${error.message}`);
    }
  }

  // Jenkins는 crumb 없는 POST를 403으로 거부한다. crumb는 발급받은 세션 쿠키와 짝이 맞아야
  // 유효하므로(Set-Cookie를 안 넘기면 crumb만 보내도 403), 둘 다 이후 요청에 실어 보낸다.
  private async getCsrfHeaders(basicAuth: string): Promise<Record<string, string>> {
    try {
      const res = await axios.get(`${this.jenkinsUrl}/crumbIssuer/api/json`, {
        headers: { 'Authorization': `Basic ${basicAuth}` },
      });
      const headers: Record<string, string> = { [res.data.crumbRequestField]: res.data.crumb };
      const setCookie = res.headers['set-cookie'];
      if (setCookie?.length) {
        headers['Cookie'] = setCookie.map((c: string) => c.split(';')[0]).join('; ');
      }
      return headers;
    } catch (error: any) {
      // crumb 발급 자체가 꺼져있는 Jenkins 설정일 수도 있으니, 못 받아와도 요청은 계속 시도한다.
      this.logger.warn(`Failed to fetch Jenkins crumb (continuing without it): ${error.message}`);
      return {};
    }
  }

  private generatePipelineConfigXml(repoUrl: string): string {
    return `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
    <scm class="hudson.plugins.git.GitSCM" plugin="git">
      <configVersion>2</configVersion>
      <userRemoteConfigs>
        <hudson.plugins.git.UserRemoteConfig>
          <url>${repoUrl}</url>
          <credentialsId>github-credentials</credentialsId>
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
