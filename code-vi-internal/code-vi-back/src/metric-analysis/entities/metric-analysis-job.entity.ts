import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../api-key/entities/api-key.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { MetricAnalysisStatus } from './metric-analysis-status.enum';
import { MetricAnalysisType } from './metric-analysis-type.enum';
import { MetricSourceType } from './metric-source-type.enum';
import { MetricAnalysisResult } from './metric-analysis-result.entity';

@Entity()
export class MetricAnalysisJob extends CommonEntity {
  @Column({
    type: 'enum',
    enum: MetricAnalysisStatus,
    default: MetricAnalysisStatus.PENDING,
  })
  status: MetricAnalysisStatus;

  @Column({
    type: 'enum',
    enum: MetricAnalysisType,
  })
  analysisType: MetricAnalysisType;

  @Column({
    type: 'enum',
    enum: MetricSourceType,
  })
  sourceType: MetricSourceType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Index()
  @Column()
  teamProjectId: number;

  @Index()
  @Column({ nullable: true })
  requestedByUserId: number | null;

  @Index()
  @Column({ nullable: true })
  apiKeyId: number | null;

  @ManyToOne(() => TeamProject, (teamProject) => teamProject.metricAnalysisJobs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @ManyToOne(() => User, (user) => user.metricAnalysisJobs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User | null;

  @ManyToOne(() => ApiKey, (apiKey) => apiKey.metricAnalysisJobs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey | null;

  @OneToOne(() => MetricAnalysisResult, (result) => result.job, {
    cascade: true,
  })
  result: MetricAnalysisResult | null;
}
