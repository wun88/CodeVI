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

    try {
      this.logger.log(`Attempting to create Jenkins Job: ${jobName}`);
      await axios.post(
        `${this.jenkinsUrl}/createItem?name=${encodeURIComponent(jobName)}`,
        configXml,
        {
          headers: { 'Content-Type': 'application/xml', 'Authorization': `Basic ${auth}` },
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
        { headers: { 'Authorization': `Basic ${auth}` } }
      );
    } catch (error: any) {
      this.logger.error(`Jenkins Build Trigger Error: ${error.message}`);
      throw new BadRequestException(`Failed to trigger Jenkins build: ${error.message}`);
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
      </branches>
    </scm>
    <scriptPath>Jenkinsfile</scriptPath>
    <lightweight>true</lightweight>
  </definition>
</flow-definition>`;
  }
}
