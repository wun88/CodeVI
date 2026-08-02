import { Module } from '@nestjs/common';
import { ZipAnalysisController } from './zip-analysis.controller';
import { ZipAnalysisService } from './zip-analysis.service';
import { ExamineModule } from '../examine/examine.module';

@Module({
  imports: [ExamineModule],
  controllers: [ZipAnalysisController],
  providers: [ZipAnalysisService],
})
export class ZipAnalysisModule {}
