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
  ],
  controllers: [AstRelationalController],
  providers: [AstRelationalService],
  exports: [AstRelationalService],
})
export class AstRelationalModule {}
