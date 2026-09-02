import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AstRelationalService } from './ast-relational.service';
import { AstRelationalController } from './ast-relational.controller';
import { AstSnapshot } from './entity/ast-snapshot.entity';
import { AstDirectory } from './entity/ast-directory.entity';
import { AstFile } from './entity/ast-file.entity';
import { AstClass } from './entity/ast-class.entity';
import { AstFunction } from './entity/ast-function.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { RequirementsModule } from '../requirements/requirements.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AstSnapshot,
      AstDirectory,
      AstFile,
      AstClass,
      AstFunction,
      TeamProject,
    ]),
    // AST 저장 성공 직후 요구사항-코드 매핑을 fire-and-forget으로 재계산하기 위해
    // CodeMappingService를 가져온다 (jej_23 Phase 7). RequirementsModule은 다른 모듈을
    // import하지 않는 leaf 모듈이라 순환 참조가 없다.
    RequirementsModule,
    // 리팩토링 인사이트 AI 제안(NVIDIA) 생성을 위한 LLM 클라이언트.
    LlmModule,
  ],
  controllers: [AstRelationalController],
  providers: [AstRelationalService],
  exports: [AstRelationalService],
})
export class AstRelationalModule {}
