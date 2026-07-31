import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { Requirement } from './requirement.entity';

/**
 * 요구사항-문서/코드/빌드/테스트 추적성(1:1) — jej_20 Phase 2.
 * "코드 연결 시 자동 매핑"의 결과가 저장되는 곳. 값 계산은 Phase 5에서 채운다.
 */
@Entity()
export class TraceabilityRecord extends CommonEntity {
  @Column({ unique: true })
  requirementId: number;

  @OneToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  /** 조회 편의를 위한 요구사항 제목 캐시(ReqFlow 원본 설계 유지) */
  @Column({ type: 'varchar' })
  requirementTitle: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'json' })
  linkedDocuments: string[];

  @Column({ type: 'json' })
  linkedCodeFiles: string[];

  @Column({ type: 'json' })
  linkedBuilds: number[];

  @Column({ type: 'json' })
  linkedTests: string[];

  @Column({ type: 'float', default: 0 })
  similarityScore: number;

  @Column({ type: 'varchar' })
  linkStatus: string;
}
