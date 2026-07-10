import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../api-key/entities/api-key.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SmellAnalysisStatus } from './smell-analysis-status.enum';
import { SmellAnalysisFinding } from './smell-analysis-finding.entity';

/**
 * SmellAnalysisJob
 *
 * advanced_pyexamine 기반 code smell 분석 요청 단위 저장 entity.
 * metric-analysis와 별도 domain으로 분리한다.
 *
 * 참고: docs/codevi-smell-analysis-contract.md "저장 모델 > SmellAnalysisJob"
 */
@Entity()
export class SmellAnalysisJob extends CommonEntity {
  // ---------------------------------------------------------------------------
  // 공통 식별자
  // ---------------------------------------------------------------------------

  @Index()
  @Column()
  teamProjectId: number;

  /** Jenkins/Sonar 기반 code analysis job ID (선택) */
  @Index()
  @Column({ type: 'int', nullable: true })
  codeAnalysisId: number | null;

  /** metric-analysis job ID (선택) */
  @Index()
  @Column({ type: 'int', nullable: true })
  metricAnalysisJobId: number | null;

  @Column({ type: 'int', nullable: true })
  buildNumber: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  commitHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceRef: string | null;

  // ---------------------------------------------------------------------------
  // 분석 대상
  // ---------------------------------------------------------------------------

  /** 분석 언어: python, typescript, java, c 등 */
  @Column({ type: 'varchar', length: 50 })
  language: string;

  /** 분석 도구: advanced_pyexamine 등 */
  @Column({ type: 'varchar', length: 100 })
  analyzer: string;

  /** analyzer package 또는 image version (선택) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  analyzerVersion: string | null;

  // ---------------------------------------------------------------------------
  // 상태
  // ---------------------------------------------------------------------------

  @Column({
    type: 'enum',
    enum: SmellAnalysisStatus,
    default: SmellAnalysisStatus.PENDING,
  })
  status: SmellAnalysisStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  // ---------------------------------------------------------------------------
  // Summary (전체 분석 기준 — summaryOnly 여부와 무관)
  // ---------------------------------------------------------------------------

  @Column({ default: 0 })
  summaryTotal: number;

  /** { high: 11, medium: 32 } */
  @Column({ type: 'json' })
  summaryBySeverity: Record<string, number>;

  /** { long_method: 41, data_clumps: 2 } */
  @Column({ type: 'json' })
  summaryByName: Record<string, number>;

  // ---------------------------------------------------------------------------
  // 요청 옵션 및 원본 응답
  // ---------------------------------------------------------------------------

  /** 요청 시 전달한 옵션: only, summaryOnly, limitPerGroup 등 */
  @Column({ type: 'json', nullable: true })
  requestOptions: Record<string, unknown> | null;

  /** MCP/service 원본 응답 (디버그 보존용, 선택) */
  @Column({ type: 'json', nullable: true })
  rawResult: unknown | null;

  // ---------------------------------------------------------------------------
  // 에러
  // ---------------------------------------------------------------------------

  /** FAILED 시 실패 분류 코드 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  // ---------------------------------------------------------------------------
  // 요청자 (metric-analysis 패턴 동일)
  // ---------------------------------------------------------------------------

  @Index()
  @Column({ type: 'int', nullable: true })
  requestedByUserId: number | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  apiKeyId: number | null;

  // ---------------------------------------------------------------------------
  // Relations
  // ---------------------------------------------------------------------------

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User | null;

  @ManyToOne(() => ApiKey, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey | null;

  @OneToMany(() => SmellAnalysisFinding, (finding) => finding.job, {
    cascade: true,
  })
  findings: SmellAnalysisFinding[];
}
