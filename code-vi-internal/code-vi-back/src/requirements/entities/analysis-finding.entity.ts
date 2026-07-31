import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { AnalysisFindingType } from './analysis-finding-type.enum';
import { AnalysisSeverity } from './analysis-severity.enum';

/**
 * AI 분석 findings(중복/충돌/누락 등) — jej_20 Phase 2.
 * ReqFlow 원본 prisma 모델에는 projectId가 없었으나(글로벌 컬렉션), 프로젝트 단위 조회 편의를 위해
 * teamProjectId를 추가했다(jej_20 spec 4.4 참고).
 */
@Entity()
export class AnalysisFinding extends CommonEntity {
  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Column({ type: 'enum', enum: AnalysisFindingType })
  type: AnalysisFindingType;

  @Column({ type: 'json' })
  requirementIds: number[];

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: AnalysisSeverity })
  severity: AnalysisSeverity;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'text' })
  suggestedAction: string;

  @Column({ type: 'text', nullable: true })
  aiExplanation: string | null;

  @Column({ type: 'float', nullable: true })
  similarityScore: number | null;
}
