import { Module } from '@nestjs/common';
import { GithubService } from './github.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule { }
