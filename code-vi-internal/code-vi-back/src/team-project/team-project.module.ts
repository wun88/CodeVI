import { forwardRef, Module } from '@nestjs/common';
import { TeamProjectService } from './team-project.service';
import { TeamProjectController } from './team-project.controller';
import { CodeAnalysis } from '../code-analysis/entities/code-analysis.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { User } from '../users/entities/user.entity';
import { TeamProject } from './entities/team-project.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeamProject, CodeAnalysis]),
    forwardRef(() => UsersModule),
    HttpModule,
  ],
  controllers: [TeamProjectController],
  providers: [TeamProjectService],
  exports: [TeamProjectService],
})
export class TeamProjectModule {}
