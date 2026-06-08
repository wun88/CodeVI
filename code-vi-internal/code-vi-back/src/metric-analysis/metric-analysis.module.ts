import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricAnalysisJob } from './entities/metric-analysis-job.entity';
import { MetricAnalysisResult } from './entities/metric-analysis-result.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { MetricAnalysisService } from './metric-analysis.service';
import { MetricAnalysisController } from './metric-analysis.controller';
import { MetricModule } from '../metric/metric.module';
import { ApiKeyModule } from '../api-key/api-key.module';
import { UsersModule } from '../users/users.module';
import { JwtOrApiKeyGuard } from './guards/jwt-or-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetricAnalysisJob, MetricAnalysisResult, TeamProject]),
    MetricModule,
    ApiKeyModule,
    UsersModule,
  ],
  controllers: [MetricAnalysisController],
  providers: [MetricAnalysisService, JwtOrApiKeyGuard],
  exports: [MetricAnalysisService, TypeOrmModule],
})
export class MetricAnalysisModule {}
