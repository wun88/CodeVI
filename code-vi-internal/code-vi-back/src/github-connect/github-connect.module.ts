import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GithubConnectController } from './github-connect.controller';
import { GithubConnectService } from './github-connect.service';
import { GithubModule } from '../github-analysis/github/github.module';
import { JenkinsModule } from '../github-analysis/jenkins/jenkins.module';
import { TeamProject } from '../team-project/entities/team-project.entity';
import { User } from '../users/entities/user.entity';

// AuthService/JwtService는 AuthModule이 @Global()이라 별도 import 없이 주입 가능하다.
@Module({
  imports: [TypeOrmModule.forFeature([TeamProject, User]), GithubModule, JenkinsModule],
  controllers: [GithubConnectController],
  providers: [GithubConnectService],
})
export class GithubConnectModule {}
