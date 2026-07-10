import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmellAnalysisJob } from './entities/smell-analysis-job.entity';
import { SmellAnalysisFinding } from './entities/smell-analysis-finding.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { SmellAnalysisService } from './smell-analysis.service';
import { SmellAnalysisController } from './smell-analysis.controller';
import { SmellAnalysisJwtOrApiKeyGuard } from './guards/smell-analysis-jwt-or-api-key.guard';
import { ApiKeyModule } from '../api-key/api-key.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SmellAnalysisJob, SmellAnalysisFinding, TeamProject]),
    ApiKeyModule,
    UsersModule,
  ],
  controllers: [SmellAnalysisController],
  providers: [SmellAnalysisService, SmellAnalysisJwtOrApiKeyGuard],
  exports: [SmellAnalysisService, TypeOrmModule],
})
export class SmellAnalysisModule {}
