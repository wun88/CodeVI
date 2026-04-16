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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
})
export class AppModule { }
