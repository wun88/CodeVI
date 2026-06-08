import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyService } from './api-key.service';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, TeamProject])],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
