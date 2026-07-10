import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeUnit } from './entity/code-unit.entity';
import { CodeRelation } from './entity/code-relation.entity';
import { Finding } from './entity/finding.entity';
import { CodeGraphService } from './code-graph.service';
import { CodeGraphController } from './code-graph.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CodeUnit, CodeRelation, Finding])],
  controllers: [CodeGraphController],
  providers: [CodeGraphService],
  exports: [CodeGraphService],
})
export class CodeGraphModule {}
