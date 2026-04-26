import { CodeAnalysis } from '../../code-analysis/entities/code-analysis.entity';
import { CommonEntity } from '../../common/entities/common.entity';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AstSnapshot } from '../../ast-relational/entity/ast-snapshot.entity';

@Entity()
export class TeamProject extends CommonEntity {
  @Column({ type: 'varchar' })
  teamName: string;

  @Column()
  JenkinsJobName: string;

  @Column({ nullable: true })
  sonarProjectKey: string;

  @OneToMany(() => CodeAnalysis, (codeAnalysis) => codeAnalysis.teamProject, {
    cascade: true,
  })
  codeAnalyses: CodeAnalysis[];

  @OneToMany(() => AstSnapshot, (astSnapshot) => astSnapshot.teamProject, {
    cascade: true,
  })
  astSnapshots: AstSnapshot[];

  @ManyToMany(() => User, (user) => user.teamProjects)
  @JoinTable()
  users: User[];
}
