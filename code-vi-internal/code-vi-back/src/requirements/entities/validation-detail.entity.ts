import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { Requirement } from './requirement.entity';

/**
 * 요구사항-코드 검증 상세(1:1) — jej_20 Phase 2.
 * 실제 값 계산(recompute)은 Phase 5("코드 연결 & 자동 매핑")에서 채운다. 지금은 스키마만 마련한다.
 */
@Entity()
export class ValidationDetail extends CommonEntity {
  @Column({ unique: true })
  requirementId: number;

  @OneToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ type: 'json' })
  matches: Record<string, unknown>[];

  @Column({ type: 'json' })
  missingLogic: string[];

  @Column({ type: 'text' })
  aiExplanation: string;

  @Column({ type: 'json' })
  acceptanceCriteriaStatus: Record<string, unknown>[];

  @Column({ type: 'json' })
  buildVerification: Record<string, unknown>;
}
