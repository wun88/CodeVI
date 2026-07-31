import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Requirement } from './entities/requirement.entity';
import { RequirementPriority } from './entities/requirement-priority.enum';
import { RequirementType } from './entities/requirement-type.enum';
import { AnalysisFinding } from './entities/analysis-finding.entity';
import { AnalysisFindingType } from './entities/analysis-finding-type.enum';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import type {
  BulkCreateRequirementDto,
  BulkCreateRequirementItemDto,
} from './dto/bulk-create-requirement.dto';
import type {
  DueDateAlert,
  PriorityDistribution,
  RequirementsSummaryDto,
} from './dto/requirements-summary.dto';
import {
  buildAnalysisFindings,
  sortFindingsBySeverity,
} from './lib/analysis-engine';
import { getDueDateUrgency, getDueInDays } from './lib/due-date';

// 프로젝트 멤버십 검증은 ProjectMemberGuard(jej_22 인가 가드 통합, requirements.controller.ts에서
// @UseGuards(AuthGuard(), ProjectMemberGuard) + @ProjectMember(...)로 적용)가 컨트롤러 진입 시점에
// 이미 수행한다. 이 서비스는 대상 teamProjectId가 유효한 멤버십을 가졌다고 신뢰하고 데이터만 다룬다.
@Injectable()
export class RequirementsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
    @InjectRepository(AnalysisFinding)
    private readonly analysisFindingRepository: Repository<AnalysisFinding>,
  ) {}

  /** create/createBulk가 공유하는 dto→엔티티 필드 매핑 (기본값 채우기 포함). */
  private toRequirementData(
    teamProjectId: number,
    item: Omit<CreateRequirementDto, 'teamProjectId'>,
  ) {
    return {
      teamProjectId,
      title: item.title,
      description: item.description ?? '',
      type: item.type,
      priority: item.priority ?? RequirementPriority.MEDIUM,
      ownerId: item.ownerId ?? null,
      dueDate: item.dueDate ?? null,
      source: item.source ?? null,
      relatedFeature: item.relatedFeature ?? null,
      acceptanceCriteria: item.acceptanceCriteria ?? [],
      tags: item.tags ?? null,
    };
  }

  async create(dto: CreateRequirementDto): Promise<Requirement> {
    const requirement = this.requirementRepository.create(
      this.toRequirementData(dto.teamProjectId, dto),
    );
    return this.requirementRepository.save(requirement);
  }

  /**
   * CSV 가져오기/AI 생성 결과를 한 번의 트랜잭션으로 등록한다 (PR #61 리뷰 #6).
   * 기존 프론트가 항목마다 `POST /requirements`를 순차 호출해 N회 HTTP + 행당 멤버십 재조회
   * 3쿼리가 붙었고, 중간에 실패하면 이미 저장된 앞쪽 항목을 알 수 없었다. 트랜잭션 하나로 묶어
   * 전부 성공하거나 전부 롤백되게 해 부분 저장 자체를 없앤다.
   */
  async createBulk(dto: BulkCreateRequirementDto): Promise<{
    successCount: number;
    failureCount: number;
    errors: string[];
  }> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const entities = dto.items.map((item: BulkCreateRequirementItemDto) =>
          manager.create(
            Requirement,
            this.toRequirementData(dto.teamProjectId, item),
          ),
        );
        await manager.save(entities);
      });
      return { successCount: dto.items.length, failureCount: 0, errors: [] };
    } catch (error) {
      return {
        successCount: 0,
        failureCount: dto.items.length,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async findByTeamProject(teamProjectId: number): Promise<Requirement[]> {
    return this.requirementRepository.find({
      where: { teamProjectId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 요구사항 부분 수정 — status 전이(draft→in_review→approved 등) 포함 (jej_22 PR #61 리뷰 #5) */
  async update(id: number, dto: UpdateRequirementDto): Promise<Requirement> {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException('요구사항을 찾을 수 없습니다.');
    }

    Object.assign(requirement, dto);
    return this.requirementRepository.save(requirement);
  }

  /**
   * 요구사항 삭제. AnalysisFinding.requirementIds는 FK가 아닌 JSON 배열이라 DB 레벨 CASCADE가
   * 적용되지 않는다 — 삭제되는 id를 참조하는 finding(중복/충돌 짝, 누락 대상)은 더 이상 의미가
   * 없으므로 함께 지운다(PR #61 리뷰 #19, dangling id 방지). 요구사항 삭제와 원자적으로 묶는다.
   */
  async remove(id: number): Promise<void> {
    const requirement = await this.requirementRepository.findOne({
      where: { id },
    });
    if (!requirement) {
      throw new NotFoundException('요구사항을 찾을 수 없습니다.');
    }

    const findings = await this.analysisFindingRepository.find({
      where: { teamProjectId: requirement.teamProjectId },
    });
    const staleFindingIds = findings
      .filter((finding) => finding.requirementIds.includes(id))
      .map((finding) => finding.id);

    await this.dataSource.transaction(async (manager) => {
      if (staleFindingIds.length > 0) {
        await manager.delete(AnalysisFinding, staleFindingIds);
      }
      await manager.delete(Requirement, id);
    });
  }

  /** "내 프로젝트" 목록의 배지 계산용 — 프로젝트별 요구사항 개수 (jej_20 Phase 3) */
  async countByTeamProjectIds(
    teamProjectIds: number[],
  ): Promise<Map<number, number>> {
    if (teamProjectIds.length === 0) return new Map();

    const rows = await this.requirementRepository
      .createQueryBuilder('r')
      .select('r.teamProjectId', 'teamProjectId')
      .addSelect('COUNT(*)', 'count')
      .where('r.teamProjectId IN (:...teamProjectIds)', { teamProjectIds })
      .groupBy('r.teamProjectId')
      .getRawMany<{ teamProjectId: number; count: string }>();

    return new Map(
      rows.map((row) => [Number(row.teamProjectId), Number(row.count)]),
    );
  }

  /**
   * 요구사항 중복/충돌/누락 후보를 재계산해 저장한다 (jej_20 Phase 6).
   * 기존 findings는 이번 계산 결과로 전부 교체한다 — ReqFlow 원본과 동일한 정책.
   */
  async recomputeFindings(teamProjectId: number): Promise<AnalysisFinding[]> {
    const requirements = await this.findByTeamProject(teamProjectId);
    const findings = buildAnalysisFindings(teamProjectId, requirements);

    // delete + save를 한 트랜잭션으로 묶는다 — 분리돼 있으면 delete 성공 후 save가 실패했을 때
    // 기존 findings가 전량 유실되고 복구할 수 없다.
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(AnalysisFinding, { teamProjectId });
      if (findings.length > 0) {
        await manager.save(
          findings.map((finding) => manager.create(AnalysisFinding, finding)),
        );
      }
    });

    // recomputeFindings가 findings 전량을 같은 시각에 insert하므로 createdAt은 전부 동일하다 —
    // severity/confidence 기준으로 정렬해야 결과가 결정적이다 (PR #61 리뷰 #18).
    const savedFindings = await this.analysisFindingRepository.find({
      where: { teamProjectId },
    });
    return sortFindingsBySeverity(savedFindings);
  }

  /** "내 프로젝트" 상세 화면 대시보드 섹션용 집계 (jej_20 Phase 6) */
  async getSummary(teamProjectId: number): Promise<RequirementsSummaryDto> {
    const requirements = await this.findByTeamProject(teamProjectId);
    const findings = sortFindingsBySeverity(
      await this.analysisFindingRepository.find({
        where: { teamProjectId },
      }),
    );

    const priorityDistribution: PriorityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    requirements.forEach((requirement) => {
      priorityDistribution[requirement.priority] += 1;
    });

    const dueDateAlerts: DueDateAlert[] = requirements
      .filter(
        (requirement): requirement is Requirement & { dueDate: string } => {
          if (!requirement.dueDate) return false;
          const urgency = getDueDateUrgency(
            requirement.dueDate,
            requirement.status,
          );
          return urgency === 'overdue' || urgency === 'due_soon';
        },
      )
      .map((requirement) => ({
        requirementId: requirement.id,
        title: requirement.title,
        dueDate: requirement.dueDate,
        urgency: getDueDateUrgency(requirement.dueDate, requirement.status) as
          | 'overdue'
          | 'due_soon',
        dueInDays: getDueInDays(requirement.dueDate),
      }))
      .sort((a, b) => a.dueInDays - b.dueInDays);

    return {
      total: requirements.length,
      functionalCount: requirements.filter(
        (r) => r.type === RequirementType.FUNCTIONAL,
      ).length,
      nonFunctionalCount: requirements.filter(
        (r) => r.type === RequirementType.NON_FUNCTIONAL,
      ).length,
      priorityDistribution,
      dueDateAlerts,
      analysis: {
        duplicateCount: findings.filter(
          (f) => f.type === AnalysisFindingType.DUPLICATE,
        ).length,
        conflictCount: findings.filter(
          (f) => f.type === AnalysisFindingType.CONFLICT,
        ).length,
        missingCount: findings.filter(
          (f) => f.type === AnalysisFindingType.OMISSION,
        ).length,
        totalFindings: findings.length,
        recentFindings: findings.slice(0, 5),
      },
    };
  }
}
