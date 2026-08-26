import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { Requirement } from './entities/requirement.entity';
import { ImplementationScoreSnapshot } from './entities/implementation-score-snapshot.entity';
import { CodeAnalysis } from '../code-analysis/entities/code-analysis.entity';
import {
  BuildDetailDto,
  BuildHistoryItemDto,
  ChangedRequirementDto,
  ScoreSnapshotDto,
} from './dto/build-history.dto';

function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * 실제 Jenkins 빌드 이력 + Phase 7이 남기는 implementationScore 스냅샷을 연결해 보여준다
 * (jej_23 Phase 10). ReqFlow 원본의 "빌드 시뮬레이션"·커밋메시지 정규식 매핑은 이식하지
 * 않는다 — CodeVi는 실제 Jenkins 연동이 있으므로 CodeAnalysis(실제 빌드 기록)와
 * ImplementationScoreSnapshot(재계산 시점마다 남는 점수, users.service.ts::createBuildReport가
 * buildNumber와 함께 남긴다)을 그대로 조인한다.
 */
@Injectable()
export class BuildHistoryService {
  constructor(
    @InjectRepository(CodeAnalysis)
    private readonly codeAnalysisRepository: Repository<CodeAnalysis>,
    @InjectRepository(ImplementationScoreSnapshot)
    private readonly scoreSnapshotRepository: Repository<ImplementationScoreSnapshot>,
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
  ) {}

  async getBuildHistory(teamProjectId: number): Promise<BuildHistoryItemDto[]> {
    const builds = await this.codeAnalysisRepository.find({
      where: { teamProjectId },
      order: { buildNumber: 'DESC' },
    });
    if (builds.length === 0) return [];

    const buildNumbers = builds.map((b) => b.buildNumber);
    const snapshots = await this.scoreSnapshotRepository.find({
      where: { teamProjectId, buildNumber: In(buildNumbers) },
    });

    const scoresByBuild = new Map<number, number[]>();
    for (const snap of snapshots) {
      if (snap.buildNumber == null) continue;
      const list = scoresByBuild.get(snap.buildNumber) ?? [];
      list.push(snap.score);
      scoresByBuild.set(snap.buildNumber, list);
    }

    // 증감(scoreDelta)은 "직전 빌드 대비"이므로 오래된 빌드부터 순서대로 계산한다.
    const ascending = [...builds].reverse();
    const items: BuildHistoryItemDto[] = [];
    let previousAverage: number | null = null;
    for (const build of ascending) {
      const currentAverage = average(
        scoresByBuild.get(build.buildNumber) ?? [],
      );
      items.push({
        buildNumber: build.buildNumber,
        status: build.status,
        buildUrl: build.buildUrl,
        commitHash: build.commitHash,
        createdAt: build.createdAt,
        averageScore: currentAverage,
        scoreDelta:
          currentAverage != null && previousAverage != null
            ? currentAverage - previousAverage
            : null,
      });
      if (currentAverage != null) previousAverage = currentAverage;
    }

    return items.reverse();
  }

  async getBuildDetail(
    teamProjectId: number,
    buildNumber: number,
  ): Promise<BuildDetailDto> {
    const build = await this.codeAnalysisRepository.findOne({
      where: { teamProjectId, buildNumber },
    });
    if (!build) {
      throw new NotFoundException('빌드를 찾을 수 없습니다.');
    }

    const currentSnapshots = await this.scoreSnapshotRepository.find({
      where: { teamProjectId, buildNumber },
    });

    const changedRequirements: ChangedRequirementDto[] = [];
    if (currentSnapshots.length > 0) {
      const requirements = await this.requirementRepository.find({
        where: { id: In(currentSnapshots.map((s) => s.requirementId)) },
      });
      const titleById = new Map(requirements.map((r) => [r.id, r.title]));

      // 요구사항 수는 프로젝트당 수십 건 수준을 가정한다 — 이 빌드 하나의 상세 조회에서만
      // 실행되므로(목록 API가 아님) 요청당 N회 조회는 허용 범위로 본다.
      for (const snap of currentSnapshots) {
        const previous = await this.scoreSnapshotRepository.findOne({
          where: {
            teamProjectId,
            requirementId: snap.requirementId,
            createdAt: LessThan(snap.createdAt),
          },
          order: { createdAt: 'DESC' },
        });
        if (!previous || previous.score !== snap.score) {
          changedRequirements.push({
            requirementId: snap.requirementId,
            title: titleById.get(snap.requirementId) ?? '',
            previousScore: previous?.score ?? null,
            currentScore: snap.score,
          });
        }
      }
    }

    return {
      buildNumber: build.buildNumber,
      status: build.status,
      buildUrl: build.buildUrl,
      commitHash: build.commitHash,
      createdAt: build.createdAt,
      changedRequirements,
    };
  }

  async getScoreTimeline(
    teamProjectId: number,
    requirementId?: number,
  ): Promise<ScoreSnapshotDto[]> {
    const snapshots = await this.scoreSnapshotRepository.find({
      where: requirementId
        ? { teamProjectId, requirementId }
        : { teamProjectId },
      order: { createdAt: 'ASC' },
    });
    return snapshots.map((s) => ({
      requirementId: s.requirementId,
      buildNumber: s.buildNumber,
      score: s.score,
      createdAt: s.createdAt,
    }));
  }
}
