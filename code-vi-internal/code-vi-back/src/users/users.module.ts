import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TeamProjectModule } from 'src/team-project/team-project.module';
import { AstRelationalModule } from 'src/ast-relational/ast-relational.module';
import { CodeGraphModule } from 'src/code-graph/code-graph.module';
import { RequirementsModule } from 'src/requirements/requirements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => TeamProjectModule),
    AstRelationalModule,
    CodeGraphModule,
    // 실제 Jenkins 빌드 완료 시(createBuildReport) 요구사항-코드 매핑을 fire-and-forget으로
    // 재계산하기 위해 CodeMappingService를 가져온다 (jej_23 Phase 10 — 기존에는 이 경로가
    // ast-relational.service.ts의 saveAstData()에만 연결돼 있어 실제 빌드에서는 호출되지
    // 않던 누락을 이번에 고친다). RequirementsModule은 leaf 모듈이라 순환 참조가 없다.
    RequirementsModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
