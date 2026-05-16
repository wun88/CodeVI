import { Module } from '@nestjs/common';
import { ZipAnalysisController } from './zip-analysis.controller';
import { ZipAnalysisService } from './zip-analysis.service';

@Module({
  controllers: [ZipAnalysisController],
  providers: [ZipAnalysisService],
})
export class ZipAnalysisModule {}
