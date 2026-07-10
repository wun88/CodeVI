import { Module } from '@nestjs/common';
import { ExamineService } from './examine.service';

@Module({
  providers: [ExamineService],
  exports: [ExamineService],
})
export class ExamineModule {}
