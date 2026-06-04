import { CodeAnalysis } from '../../code-analysis/entities/code-analysis.entity';
import { CommonEntity } from '../../common/entities/common.entity';
import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AstSnapshot } from '../../ast-relational/entity/ast-snapshot.entity';
import { ApiKey } from '../../api-key/entities/api-key.entity';
import { MetricAnalysisJob } from '../../metric-analysis/entities/metric-analysis-job.entity';

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

  @OneToMany(() => ApiKey, (apiKey) => apiKey.teamProject, { cascade: true })
  apiKeys: ApiKey[];

  @OneToMany(
    () => MetricAnalysisJob,
    (metricAnalysisJob) => metricAnalysisJob.teamProject,
    { cascade: true },
  )
  metricAnalysisJobs: MetricAnalysisJob[];
}
