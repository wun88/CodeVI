import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Requirement } from './entities/requirement.entity';
import { RequirementVersion } from './entities/requirement-version.entity';
import { Baseline } from './entities/baseline.entity';
import { AnalysisFinding } from './entities/analysis-finding.entity';
import { ValidationDetail } from './entities/validation-detail.entity';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { RequirementOwnerGuard } from './guards/requirement-owner.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Requirement,
      RequirementVersion,
      Baseline,
      AnalysisFinding,
      ValidationDetail,
      TraceabilityRecord,
      // TeamProjectModule을 import하지 않고 엔티티만 등록 — TeamProjectModule이 이미
      // RequirementsModule을 import하므로(Phase 3) 순환 참조를 피하기 위함.
      TeamProject,
    ]),
  ],
  controllers: [RequirementsController],
  providers: [RequirementsService, RequirementOwnerGuard],
  exports: [TypeOrmModule, RequirementsService],
})
export class RequirementsModule {}
