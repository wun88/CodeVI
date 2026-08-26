import type { DependencyItem } from './dependency.dto';

/** `GET /api/requirements/:id/impact` 응답 — 코드/문서/빌드/테스트 연결(Phase 5/7) + 의존관계(Phase 8) 종합 (jej_23 Phase 8) */
export interface ImpactAnalysisDto {
  requirementId: number;
  linkedCodeFiles: string[];
  linkedDocuments: string[];
  linkedBuilds: number[];
  linkedTests: string[];
  outgoingDependencies: DependencyItem[];
  incomingDependencies: DependencyItem[];
}
