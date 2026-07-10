import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfig } from './configs/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { TeamProjectModule } from './team-project/team-project.module';
import { CodeAnalysisModule } from './code-analysis/code-analysis.module';
import { MetricModule } from './metric/metric.module';
import { AstRelationalModule } from './ast-relational/ast-relational.module';
import { OnboardingModule } from './github-analysis/onboarding/onboarding.module';
import { ZipAnalysisModule } from './zip-analysis/zip-analysis.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { MetricAnalysisModule } from './metric-analysis/metric-analysis.module';
import { CodeGraphModule } from './code-graph/code-graph.module';
import { SmellAnalysisModule } from './smell-analysis/smell-analysis.module';

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
    MetricModule,
    AstRelationalModule,
    OnboardingModule,
    ZipAnalysisModule,
    ApiKeyModule,
    MetricAnalysisModule,
    CodeGraphModule,
    SmellAnalysisModule,
  ],
})
export class AppModule { }
