import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './configs/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { TeamProjectModule } from './team-project/team-project.module';
import { CodeAnalysisModule } from './code-analysis/code-analysis.module';
import { AstRelationalModule } from './ast-relational/ast-relational.module';
import { OnboardingModule } from './github-analysis/onboarding/onboarding.module';
import { ZipAnalysisModule } from './zip-analysis/zip-analysis.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { CodeGraphModule } from './code-graph/code-graph.module';
import { GithubConnectModule } from './github-connect/github-connect.module';
import { RequirementsModule } from './requirements/requirements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfig,
    }),
    AuthModule,
    UsersModule,
    TeamProjectModule,
    CodeAnalysisModule,
    AstRelationalModule,
    OnboardingModule,
    ZipAnalysisModule,
    ApiKeyModule,
    CodeGraphModule,
    GithubConnectModule,
    RequirementsModule,
  ],
})
export class AppModule {}
