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

  // nullable: "새 프로젝트 시작하기"(요구사항 우선) 플로우로 생성된 프로젝트는
  // GitHub/Jenkins 연동 전까지 Jenkins Job이 없다 (jej_20 Phase 1).
  // unique: JenkinsJobName으로 TeamProject를 find-or-create하는 경로가 2곳(Jenkins 웹훅
  // createJenkinsNotification, 코드 연결 registerProject)이라 같은 job name으로 행이 중복
  // 생성될 수 있다 — DB 제약으로 원천 차단한다. MySQL 유니크 인덱스는 NULL을 여러 개 허용하므로
  // "새 프로젝트 시작하기"로 만든 JenkinsJobName=null 프로젝트 다건과는 무관하다.
  @Column({ type: 'varchar', nullable: true, unique: true })
  JenkinsJobName: string | null;

  @Column({ type: 'varchar', nullable: true })
  sonarProjectKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  githubRepoFullName: string | null;

  @Column({ type: 'varchar', nullable: true, default: 'main' })
  githubDefaultBranch: string | null;

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
