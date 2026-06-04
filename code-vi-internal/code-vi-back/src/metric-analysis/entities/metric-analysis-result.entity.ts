import { CommonEntity } from '../../common/entities/common.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { MetricAnalysisJob } from './metric-analysis-job.entity';

@Entity()
export class MetricAnalysisResult extends CommonEntity {
  @Column()
  jobId: number;

  @Column({ type: 'json', nullable: true })
  summaryJson: unknown | null;

  @Column({ type: 'json', nullable: true })
  classicJson: unknown | null;

  @Column({ type: 'json', nullable: true })
  ckJson: unknown | null;

  @Column({ type: 'json', nullable: true })
  ooJson: unknown | null;

  @Column({ type: 'json', nullable: true })
  smellsJson: unknown | null;

  @OneToOne(() => MetricAnalysisJob, (job) => job.result, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobId' })
  job: MetricAnalysisJob;
}
