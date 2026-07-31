import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';

/** 요구사항 집합 스냅샷 (jej_20 Phase 2) */
@Entity()
export class Baseline extends CommonEntity {
  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'json' })
  requirementIds: number[];
}
