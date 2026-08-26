import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Requirement } from './entities/requirement.entity';
import { ValidationDetail } from './entities/validation-detail.entity';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { ImplementationScoreSnapshot } from './entities/implementation-score-snapshot.entity';
import { AstSnapshot } from '../ast-relational/entity/ast-snapshot.entity';
import {
  CandidateMatch,
  CodeCandidate,
  computeRequirementMapping,
  getMappingStatus,
} from './lib/code-mapping-engine';
import type {
  MappingRecomputeResultDto,
  MappingSummaryDto,
} from './dto/mapping-summary.dto';
import type { MatchDetailItemDto } from './dto/match-detail.dto';

/**
 * 요구사항-코드 자동 매핑 (jej_23 Phase 7). AST 저장 직후(ast-relational.service.ts,
 * fire-and-forget) 및 "재검증" 버튼(POST .../mapping/recompute)에서 호출된다.
 */
@Injectable()
export class CodeMappingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
    @InjectRepository(ValidationDetail)
    private readonly validationDetailRepository: Repository<ValidationDetail>,
    @InjectRepository(TraceabilityRecord)
    private readonly traceabilityRecordRepository: Repository<TraceabilityRecord>,
    @InjectRepository(AstSnapshot)
    private readonly astSnapshotRepository: Repository<AstSnapshot>,
    @InjectRepository(ImplementationScoreSnapshot)
    private readonly scoreSnapshotRepository: Repository<ImplementationScoreSnapshot>,
  ) {}

  /**
   * 최신 AstSnapshot을 파일/클래스/함수 후보 목록으로 평탄화한다. 디렉토리 경로는
   * parentDirectoryId를 따라 직접 조립한다(snapshot.directories는 스냅샷의 전체 디렉토리를
   * 평평하게 담고 있으므로 childDirectories 관계 없이도 각 디렉토리의 files에 바로 접근 가능).
   */
  private async loadLatestCandidates(
    teamProjectId: number,
  ): Promise<CodeCandidate[]> {
    const snapshot = await this.astSnapshotRepository.findOne({
      where: { teamProjectId },
      order: { createdAt: 'DESC' },
      relations: [
        'directories',
        'directories.files',
        'directories.files.classes',
        'directories.files.classes.methods',
        'directories.files.fileFunctions',
      ],
    });
    if (!snapshot) return [];

    const dirById = new Map(snapshot.directories.map((dir) => [dir.id, dir]));
    const resolvePath = (dirId: number): string => {
      const segments: string[] = [];
      let current = dirById.get(dirId);
      while (current) {
        segments.unshift(current.name);
        current =
          current.parentDirectoryId != null
            ? dirById.get(current.parentDirectoryId)
            : undefined;
      }
      return segments.join('/');
    };

    const candidates: CodeCandidate[] = [];
    for (const dir of snapshot.directories) {
      const dirPath = resolvePath(dir.id);
      for (const file of dir.files ?? []) {
        const filePath = dirPath ? `${dirPath}/${file.name}` : file.name;
        candidates.push({
          type: 'file',
          id: file.id,
          name: file.name,
          path: filePath,
        });
        for (const cls of file.classes ?? []) {
          candidates.push({
            type: 'class',
            id: cls.id,
            name: cls.name,
            path: filePath,
          });
          for (const method of cls.methods ?? []) {
            candidates.push({
              type: 'function',
              id: method.id,
              name: method.name,
              path: filePath,
            });
          }
        }
        for (const fn of file.fileFunctions ?? []) {
          candidates.push({
            type: 'function',
            id: fn.id,
            name: fn.name,
            path: filePath,
          });
        }
      }
    }
    return candidates;
  }

  /**
   * buildNumber가 있으면 실제 Jenkins 빌드(users.service.ts::createBuildReport)가 트리거한
   * 재계산이다 — Phase 10 빌드 이력/스코어 타임라인이 이 값으로 CodeAnalysis와 연결된다.
   * null이면 AST 저장 직후 자동 실행 또는 "재검증" 버튼 등 수동 재계산이다.
   */
  async recomputeForTeamProject(
    teamProjectId: number,
    buildNumber: number | null = null,
  ): Promise<MappingRecomputeResultDto> {
    const requirements = await this.requirementRepository.find({
      where: { teamProjectId },
    });
    const candidates = await this.loadLatestCandidates(teamProjectId);
    const results = requirements.map((requirement) =>
      computeRequirementMapping(requirement, candidates),
    );

    await this.dataSource.transaction(async (manager) => {
      for (const result of results) {
        const requirement = requirements.find(
          (r) => r.id === result.requirementId,
        );
        if (!requirement) continue;

        await manager.update(Requirement, result.requirementId, {
          implementationScore: result.implementationScore,
        });

        await manager.save(
          ImplementationScoreSnapshot,
          manager.create(ImplementationScoreSnapshot, {
            teamProjectId,
            requirementId: result.requirementId,
            buildNumber,
            score: result.implementationScore,
          }),
        );

        // ValidationDetail/TraceabilityRecord는 1:1이라 delete 후 재삽입한다
        // (recomputeFindings와 동일한 "전량 교체" 방식, requirements.service.ts 참고).
        await manager.delete(ValidationDetail, {
          requirementId: result.requirementId,
        });
        await manager.save(
          manager.create(ValidationDetail, {
            requirementId: result.requirementId,
            matches: result.matches as unknown as Record<string, unknown>[],
            missingLogic: result.missingLogic,
            aiExplanation: result.aiExplanation,
            acceptanceCriteriaStatus:
              result.acceptanceCriteriaStatus as unknown as Record<
                string,
                unknown
              >[],
            buildVerification: {},
          }),
        );

        await manager.delete(TraceabilityRecord, {
          requirementId: result.requirementId,
        });
        await manager.save(
          manager.create(TraceabilityRecord, {
            requirementId: result.requirementId,
            teamProjectId,
            requirementTitle: requirement.title,
            source: 'ast-mapping',
            linkedDocuments: [],
            linkedCodeFiles: [...new Set(result.matches.map((m) => m.path))],
            linkedBuilds: buildNumber != null ? [buildNumber] : [],
            linkedTests: [],
            similarityScore: result.similarityAvg,
            linkStatus: getMappingStatus(result.implementationScore),
          }),
        );
      }
    });

    return {
      total: requirements.length,
      mapped: results.filter((r) => r.implementationScore > 0).length,
    };
  }

  async getMappingSummary(teamProjectId: number): Promise<MappingSummaryDto> {
    const requirements = await this.requirementRepository.find({
      where: { teamProjectId },
      order: { createdAt: 'DESC' },
    });
    const requirementIds = requirements.map((r) => r.id);

    // "항목별 유사도 · 매칭 N · 누락 N" 통계(spec 2장 Phase 7) — recomputeForTeamProject가
    // 저장해둔 ValidationDetail/TraceabilityRecord에서 읽는다.
    const [validationDetails, traceabilityRecords] =
      requirementIds.length > 0
        ? await Promise.all([
            this.validationDetailRepository.find({
              where: { requirementId: In(requirementIds) },
            }),
            this.traceabilityRecordRepository.find({
              where: { requirementId: In(requirementIds) },
            }),
          ])
        : [[], []];

    const detailByRequirementId = new Map(
      validationDetails.map((d) => [d.requirementId, d]),
    );
    const traceByRequirementId = new Map(
      traceabilityRecords.map((t) => [t.requirementId, t]),
    );

    return {
      total: requirements.length,
      mapped: requirements.filter((r) => r.implementationScore > 0).length,
      requirements: requirements.map((r) => {
        const detail = detailByRequirementId.get(r.id);
        const trace = traceByRequirementId.get(r.id);
        return {
          requirementId: r.id,
          title: r.title,
          implementationScore: r.implementationScore,
          status: getMappingStatus(r.implementationScore),
          similarityAvg: trace?.similarityScore ?? 0,
          matchCount: detail?.matches.length ?? 0,
          missingCount: detail?.missingLogic.length ?? 0,
        };
      }),
    };
  }

  /**
   * 요구사항 하나에 매칭된 코드 요소(파일/클래스/함수) top-5를 이름·경로·개별 점수와 함께
   * 반환한다 — 지금까지 matchCount/missingCount 집계 숫자로만 노출하던 것을 개별 항목
   * 단위로 펼쳐서 보여준다(jej_23 Phase 7 후속, RequirementDetailModal 영향분석 섹션용).
   * score는 이미 `computeRequirementMapping`이 점수 내림차순으로 정렬해 저장해뒀다.
   */
  async getMatchDetail(requirementId: number): Promise<MatchDetailItemDto[]> {
    const detail = await this.validationDetailRepository.findOne({
      where: { requirementId },
    });
    if (!detail) return [];

    const matches = detail.matches as unknown as CandidateMatch[];
    return matches.map((m) => ({
      type: m.type,
      name: m.name,
      path: m.path,
      score: Math.round(m.score * 100),
    }));
  }
}
