import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { Requirement } from './requirement.entity';
import { DependencyType } from './dependency-type.enum';

/**
 * 요구사항 간 의존관계 (jej_23 Phase 8).
 * requirement가 targetRequirement에 의존/연관/충돌/중복된다는 방향성 있는 간선.
 * requirement/targetRequirement 둘 다 Requirement를 참조하므로 onDelete: 'CASCADE'를
 * 명시해야 한다(jej_23 스펙 §1.4 — TypeORM은 자동으로 cascade하지 않는다).
 */
@Entity()
@Index(['requirementId', 'targetRequirementId'], { unique: true })
export class RequirementDependency extends CommonEntity {
  @Index()
  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Index()
  @Column()
  targetRequirementId: number;

  @ManyToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetRequirementId' })
  targetRequirement: Requirement;

  @Column({ type: 'enum', enum: DependencyType })
  type: DependencyType;
}
