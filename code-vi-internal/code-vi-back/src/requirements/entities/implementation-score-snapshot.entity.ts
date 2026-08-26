import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { Requirement } from './requirement.entity';

/**
 * 요구사항-코드 매핑 재계산(CodeMappingService.recomputeForTeamProject) 실행마다 남기는
 * implementationScore 이력 — jej_23 Phase 10. buildNumber가 있으면 실제 Jenkins 빌드가 트리거한
 * 재계산(users.service.ts::createBuildReport), null이면 "재검증" 버튼 등 수동 재계산이다.
 */
@Entity()
export class ImplementationScoreSnapshot extends CommonEntity {
  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Index()
  @Column()
  requirementId: number;

  @ManyToOne(() => Requirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requirementId' })
  requirement: Requirement;

  @Index()
  @Column({ type: 'int', nullable: true })
  buildNumber: number | null;

  @Column({ type: 'int' })
  score: number;
}
