import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { User } from '../../users/entities/user.entity';
import { Requirement } from './requirement.entity';

/** 요구사항 변경 이력 (jej_20 Phase 2) */
@Entity()
export class RequirementVersion extends CommonEntity {
  @Index()
  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, (requirement) => requirement.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Column({ type: 'varchar' })
  version: string;

  @Index()
  @Column({ nullable: true })
  changedById: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedById' })
  changedBy: User | null;

  @Column({ type: 'text' })
  changeSummary: string;

  @Column({ type: 'text' })
  previousContent: string;

  @Column({ type: 'text' })
  currentContent: string;
}
