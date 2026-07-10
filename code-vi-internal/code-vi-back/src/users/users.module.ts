import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { TeamProjectModule } from 'src/team-project/team-project.module';
import { AstRelationalModule } from 'src/ast-relational/ast-relational.module';
import { CodeGraphModule } from 'src/code-graph/code-graph.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => TeamProjectModule),
    AstRelationalModule,
    CodeGraphModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }