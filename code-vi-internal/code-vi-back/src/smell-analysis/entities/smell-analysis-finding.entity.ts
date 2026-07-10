import { CommonEntity } from '../../common/entities/common.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SmellAnalysisJob } from './smell-analysis-job.entity';

/**
 * SmellAnalysisFinding
 *
 * 개별 smell 탐지 결과 저장 entity.
 * dashboard filePath / severity / name 필터링을 위해 별도 테이블로 분리한다.
 *
 * 참고: docs/codevi-smell-analysis-contract.md "저장 모델 > SmellAnalysisFinding"
 */
@Entity()
export class SmellAnalysisFinding extends CommonEntity {
  // ---------------------------------------------------------------------------
  // 부모 참조 (쿼리 최적화를 위해 teamProjectId 중복 저장)
  // ---------------------------------------------------------------------------

  @Index()
  @Column()
  smellAnalysisJobId: number;

  @Index()
  @Column()
  teamProjectId: number;

  // ---------------------------------------------------------------------------
  // 공통 smell 정규화 필드
  // ---------------------------------------------------------------------------

  @Column({ type: 'varchar', length: 50 })
  language: string;

  /** smell rule name: long_method, data_clumps 등 */
  @Index()
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** analyzer category: size_metric 등 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  /** high | medium | low | unknown */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  severity: string;

  /** source relative file path */
  @Index()
  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string | null;

  @Column({ type: 'int', nullable: true })
  lineStart: number | null;

  @Column({ type: 'int', nullable: true })
  lineEnd: number | null;

  /** class, function, module 이름 등 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  entity: string | null;

  /** remediation message: Extract Method 등 */
  @Column({ type: 'text', nullable: true })
  message: string | null;

  /** detector-specific metric: { loc: 61, threshold: 50 } */
  @Column({ type: 'json', nullable: true })
  metrics: Record<string, unknown> | null;

  /** 연관 위치 목록 */
  @Column({ type: 'json', nullable: true })
  relatedLocations: unknown[] | null;

  /** analyzer 원본 finding (언어별 추가 필드 보존) */
  @Column({ type: 'json', nullable: true })
  rawFinding: unknown | null;

  // ---------------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------------

  @ManyToOne(() => SmellAnalysisJob, (job) => job.findings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'smellAnalysisJobId' })
  job: SmellAnalysisJob;
}
