import { TeamProject } from '../entities/team-project.entity';
import { CodeAnalysis } from '../../code-analysis/entities/code-analysis.entity';

/** getAllBuildHistory/getTeamDataWithAstData가 leftJoinAndMapOne으로 채우는 가상 프로퍼티 */
type TeamProjectWithLatestAnalysis = TeamProject & {
  latestAnalysis?: CodeAnalysis | null;
};

/**
 * 목록 카드용 경량 품질 점수 — Dashboard/QualityDonut이 쓰는 AST 기반 정밀 산식
 * (`code-vi-front/src/utils/buildSnapshotOverview.ts`)은 클래스별 WMC/LCOM/CBO 등
 * 프로젝트 목록 조회에는 과한 데이터가 필요해, 이미 `latestAnalysis`에 있는 SonarQube 요약
 * 지표(bugs/vulnerabilities/code_smells)만으로 계산하는 별도의 단순 근사치다.
 * "내 프로젝트" 카드의 배지 표시 용도로만 쓰고, Dashboard의 정밀 점수와 동일시하지 않는다.
 */
function computeListQualityScore(analysis: {
  bugs: number;
  vulnerabilities: number;
  security_hotspots: number;
  code_smells: number;
}): number {
  const penalty =
    analysis.bugs * 3 +
    analysis.vulnerabilities * 5 +
    analysis.security_hotspots * 2 +
    analysis.code_smells * 1;
  return Math.max(0, Math.min(100, 100 - penalty));
}

export class TeamProjectResponseDto {
  id: number;
  teamName: string;
  jenkinsJobName: string | null;
  members: string[];
  codeAnalysis: {
    buildNumber: number;
    status: string;
    bugs: number;
    vulnerabilities: number;
    securityHotspots: number;
    codeSmells: number;
    complexity: number;
    cognitiveComplexity: number;
    ncloc: number;
    createdAt: Date;
  } | null;
  /** "새 프로젝트 시작하기"(요구사항 우선) 플로우로 등록된 요구사항 개수 (jej_20 Phase 3) */
  requirementsCount: number;
  /** 목록 카드 배지 — 코드 분석 존재 여부로 결정 (jej_20 spec 2장 참고) */
  statusVariant: 'code_analyzed' | 'requirements_only' | 'empty';
  statusLabel: string;

  constructor(project: TeamProject, requirementsCount = 0) {
    this.id = project.id;
    this.teamName = project.teamName;
    this.jenkinsJobName = project.JenkinsJobName;

    // ManyToMany 관계의 유저 이름만 추출
    this.members = project.users?.map((user) => user.username) ?? [];

    // 최신 분석 결과 매핑 (Service의 MapOne 결과)
    const analysis = (project as TeamProjectWithLatestAnalysis).latestAnalysis;
    this.codeAnalysis = analysis
      ? {
          buildNumber: analysis.buildNumber,
          status: analysis.status,
          bugs: analysis.bugs,
          vulnerabilities: analysis.vulnerabilities,
          securityHotspots: analysis.security_hotspots,
          codeSmells: analysis.code_smells,
          complexity: analysis.complexity,
          cognitiveComplexity: analysis.cognitive_complexity,
          ncloc: analysis.ncloc,
          createdAt: analysis.createdAt,
        }
      : null;

    this.requirementsCount = requirementsCount;

    if (analysis) {
      this.statusVariant = 'code_analyzed';
      this.statusLabel = `코드 분석 완료 · ${computeListQualityScore(analysis)}점`;
    } else if (requirementsCount > 0) {
      this.statusVariant = 'requirements_only';
      this.statusLabel = '요구사항만 있음 · 코드 없음';
    } else {
      this.statusVariant = 'empty';
      this.statusLabel = '분석 대기 중';
    }
  }
}
