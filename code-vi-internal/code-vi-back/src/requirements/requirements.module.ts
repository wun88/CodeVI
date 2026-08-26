import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Requirement } from './entities/requirement.entity';
import { RequirementVersion } from './entities/requirement-version.entity';
import { RequirementDependency } from './entities/requirement-dependency.entity';
import { Baseline } from './entities/baseline.entity';
import { AnalysisFinding } from './entities/analysis-finding.entity';
import { ValidationDetail } from './entities/validation-detail.entity';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { ImplementationScoreSnapshot } from './entities/implementation-score-snapshot.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { AstSnapshot } from '../ast-relational/entity/ast-snapshot.entity';
import { AstDirectory } from '../ast-relational/entity/ast-directory.entity';
import { AstFile } from '../ast-relational/entity/ast-file.entity';
import { AstClass } from '../ast-relational/entity/ast-class.entity';
import { AstFunction } from '../ast-relational/entity/ast-function.entity';
import { CodeAnalysis } from '../code-analysis/entities/code-analysis.entity';
import { RequirementsService } from './requirements.service';
import { CodeMappingService } from './code-mapping.service';
import { RequirementDependencyService } from './requirement-dependency.service';
import { DocumentsService } from './documents.service';
import { BuildHistoryService } from './build-history.service';
import { RequirementsController } from './requirements.controller';
import { RequirementOwnerGuard } from './guards/requirement-owner.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Requirement,
      RequirementVersion,
      RequirementDependency,
      Baseline,
      AnalysisFinding,
      ValidationDetail,
      TraceabilityRecord,
      GeneratedDocument,
      // TeamProjectModule/AstRelationalModule을 import하지 않고 엔티티만 등록 —
      // TeamProjectModule이 이미 RequirementsModule을 import하고(Phase 3), Phase 7에서는
      // AstRelationalModule이 RequirementsModule을 import하므로(fire-and-forget 트리거) 순환
      // 참조를 피하기 위함.
      TeamProject,
      AstSnapshot,
      AstDirectory,
      AstFile,
      AstClass,
      AstFunction,
      ImplementationScoreSnapshot,
      // Phase 10 빌드 이력 — CodeAnalysis도 같은 이유로 엔티티만 등록한다(CodeAnalysisModule
      // import 없이). RequirementsModule은 leaf 모듈이라 순환 참조가 없다.
      CodeAnalysis,
    ]),
  ],
  controllers: [RequirementsController],
  providers: [
    RequirementsService,
    CodeMappingService,
    RequirementDependencyService,
    DocumentsService,
    BuildHistoryService,
    RequirementOwnerGuard,
  ],
  exports: [
    TypeOrmModule,
    RequirementsService,
    CodeMappingService,
    RequirementDependencyService,
    DocumentsService,
    BuildHistoryService,
  ],
})
export class RequirementsModule {}
