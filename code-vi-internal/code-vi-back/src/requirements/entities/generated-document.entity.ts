import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { DocumentType } from './document-type.enum';
import type { DocumentSection } from '../lib/document-generator';

/**
 * 요구사항 기반 템플릿 문서(SRS/PRD/BRS) — jej_23 Phase 9.
 * teamProjectId FK는 Requirement처럼 자동으로 cascade가 걸리지 않으므로 명시해야 한다(스펙 §1.4).
 */
@Entity()
export class GeneratedDocument extends CommonEntity {
  @Index()
  @Column()
  teamProjectId: number;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'json' })
  sections: DocumentSection[];

  @Column({ type: 'json' })
  sourceRequirementIds: number[];

  // regenerateSection이 최초 생성 시 선택한 옵션을 그대로 재사용하도록 저장해둔다.
  @Column({ type: 'boolean', default: true })
  includeTraceability: boolean;

  @Column({ type: 'boolean', default: true })
  includeNfr: boolean;
}
