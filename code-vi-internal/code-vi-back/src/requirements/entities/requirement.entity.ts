import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';
import { RequirementType } from './requirement-type.enum';
import { RequirementPriority } from './requirement-priority.enum';
import { RequirementStatus } from './requirement-status.enum';
import { RequirementVersion } from './requirement-version.entity';

/**
 * ReqFlow(requirements-management-system) prisma/schema.prisma의 Requirement 모델을 이식.
 * projectId(string) 대신 teamProjectId(number → TeamProject)로 연결한다 (jej_20 Phase 2).
 */
@Entity()
export class Requirement extends CommonEntity {
  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: RequirementType })
  type: RequirementType;

  @Column({
    type: 'enum',
    enum: RequirementPriority,
    default: RequirementPriority.MEDIUM,
  })
  priority: RequirementPriority;

  @Column({
    type: 'enum',
    enum: RequirementStatus,
    default: RequirementStatus.DRAFT,
  })
  status: RequirementStatus;

  @Index()
  @Column({ nullable: true })
  ownerId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ownerId' })
  owner: User | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', default: '1.0' })
  version: string;

  /** 소속 베이스라인 이름/버전 (참고용 표시 문자열, Baseline 엔티티와 별도 — ReqFlow 원본 설계 유지) */
  @Column({ type: 'varchar', nullable: true })
  baseline: string | null;

  @Column({ type: 'json' })
  acceptanceCriteria: string[];

  /** Estimated Implementation Score (AI 추정치) — jej_20 Phase 5에서 코드 연결 시 갱신 */
  @Column({ type: 'int', default: 0 })
  implementationScore: number;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  relatedFeature: string | null;

  @OneToMany(() => RequirementVersion, (version) => version.requirement, {
    cascade: true,
  })
  versions: RequirementVersion[];
}
