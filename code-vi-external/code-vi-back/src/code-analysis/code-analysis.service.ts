import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CodeAnalysis } from './entities/code-analysis.entity';
import { CreateCodeAnalysisDto } from './dto/create-code-analysis.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CodeAnalysisService {
  private readonly logger = new Logger(CodeAnalysisService.name);
  constructor(
    @InjectRepository(CodeAnalysis)
    private readonly codeAnalysisRepository: Repository<CodeAnalysis>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) { }

  async createJenkinsNotification(
    dto: CreateCodeAnalysisDto,
  ): Promise<CodeAnalysis> {
    const savedAnalysis = await this.codeAnalysisRepository.save(
      this.codeAnalysisRepository.create(dto),
    );

    try {
      await this.fetchAndUpdateSonarMetrics(savedAnalysis.id, dto.jobName);
    } catch (error) {
      this.logger.error(`Failed to fetch Sonar metrics: ${error.message}`);
    }
    const result = await this.codeAnalysisRepository.findOne({
      where: { id: savedAnalysis.id },
    });
    if (!result) {
      throw new Error('Failed to retrieve saved code analysis');
    }
    return result;
  }

  private async fetchAndUpdateSonarMetrics(id: number, projectKey: string) {
    const sonarToken = this.configService.get('SONAR_TOKEN');
    const metricKeys = [
      'bugs',
      'reliability_rating',
      'reliability_remediation_effort',
      'vulnerabilities',
      'security_rating',
      'security_hotspots',
      'code_smells',
      'sqale_rating',
      'sqale_index',
      'complexity',
      'cognitive_complexity',
      'ncloc',
    ].join(',');

    const url = `http://sonarqube:9000/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}`;

    const response = await lastValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(sonarToken + ':').toString('base64')}`,
        },
      }),
    );

    const measures = response.data.component.measures;
    const metricsUpdate = {};
    measures.forEach((m) => {
      metricsUpdate[m.metric] = m.value;
    });

    await this.codeAnalysisRepository.update(id, metricsUpdate);
  }

  async findAll() {
    return await this.codeAnalysisRepository.find({ order: { id: 'DESC' } });
  }
}
