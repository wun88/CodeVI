import { Module } from '@nestjs/common';
import { MetricService } from './metric.service';
import { MetricController } from './metric.controller';

@Module({
  controllers: [MetricController],
  providers: [MetricService],
  exports: [MetricService],
})
export class MetricModule {}
