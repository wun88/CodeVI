import { Module } from '@nestjs/common';
import { CodeAnalysisService } from './code-analysis.service';
import { CodeAnalysisController } from './code-analysis.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeAnalysis } from './entities/code-analysis.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([CodeAnalysis]), HttpModule],
  controllers: [CodeAnalysisController],
  providers: [CodeAnalysisService],
  exports: [CodeAnalysisService], // 다른 모듈에서 사용한다면
})
export class CodeAnalysisModule {}
