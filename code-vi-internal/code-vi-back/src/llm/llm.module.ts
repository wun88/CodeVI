import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NvidiaLlmService } from './nvidia-llm.service';

@Module({
  imports: [HttpModule],
  providers: [NvidiaLlmService],
  exports: [NvidiaLlmService],
})
export class LlmModule {}
