import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Requirement } from './entities/requirement.entity';
import { RequirementDependency } from './entities/requirement-dependency.entity';
import { DependencyType } from './entities/dependency-type.enum';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import {
  CreateDependencyDto,
  DependencyItem,
  DependencyListDto,
} from './dto/dependency.dto';
import { ImpactAnalysisDto } from './dto/impact.dto';

/**
 * 요구사항 간 의존관계 CRUD + 순환 참조 방지 + 영향분석 (jej_23 Phase 8).
 * RequirementsService와 분리한 이유는 Phase 7의 CodeMappingService와 같은 패턴 —
 * 책임 하나(관계 그래프)를 독립된 서비스로 둔다.
 */
@Injectable()
export class RequirementDependencyService {
  constructor(
    @InjectRepository(RequirementDependency)
    private readonly dependencyRepository: Repository<RequirementDependency>,
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
    @InjectRepository(TraceabilityRecord)
    private readonly traceabilityRecordRepository: Repository<TraceabilityRecord>,
  ) {}

  async create(
    requirementId: number,
    dto: CreateDependencyDto,
  ): Promise<RequirementDependency> {
    if (requirementId === dto.targetRequirementId) {
      throw new BadRequestException(
        '요구사항은 자기 자신에 의존할 수 없습니다.',
      );
    }

    const [requirement, target] = await Promise.all([
      this.requirementRepository.findOne({ where: { id: requirementId } }),
      this.requirementRepository.findOne({
        where: { id: dto.targetRequirementId },
      }),
    ]);
    if (!requirement) {
      throw new NotFoundException('요구사항을 찾을 수 없습니다.');
    }
    if (!target) {
      throw new NotFoundException('대상 요구사항을 찾을 수 없습니다.');
    }
    if (requirement.teamProjectId !== target.teamProjectId) {
      throw new BadRequestException(
        '같은 프로젝트 내 요구사항끼리만 의존관계를 지정할 수 있습니다.',
      );
    }

    const existing = await this.dependencyRepository.findOne({
      where: { requirementId, targetRequirementId: dto.targetRequirementId },
    });
    if (existing) {
      throw new BadRequestException('이미 등록된 의존관계입니다.');
    }

    if (dto.type === DependencyType.DEPENDS_ON) {
      const createsCycle = await this.wouldCreateCycle(
        requirementId,
        dto.targetRequirementId,
      );
      if (createsCycle) {
        throw new BadRequestException(
          '순환 참조(A→B→A)가 발생하는 의존관계는 등록할 수 없습니다.',
        );
      }
    }

    const dependency = this.dependencyRepository.create({
      requirementId,
      targetRequirementId: dto.targetRequirementId,
      type: dto.type,
    });
    return this.dependencyRepository.save(dependency);
  }

  /**
   * target에서 시작해 depends_on 간선만 따라가며 requirementId로 되돌아오는 경로가 있으면
   * 이번 간선(requirementId → target) 추가 시 순환이 생긴다.
   */
  private async wouldCreateCycle(
    requirementId: number,
    targetRequirementId: number,
  ): Promise<boolean> {
    const visited = new Set<number>();
    const queue = [targetRequirementId];

    while (queue.length > 0) {
      const current = queue.shift() as number;
      if (current === requirementId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const edges = await this.dependencyRepository.find({
        where: { requirementId: current, type: DependencyType.DEPENDS_ON },
      });
      queue.push(...edges.map((edge) => edge.targetRequirementId));
    }

    return false;
  }

  async remove(requirementId: number, dependencyId: number): Promise<void> {
    const dependency = await this.dependencyRepository.findOne({
      where: { id: dependencyId, requirementId },
    });
    if (!dependency) {
      throw new NotFoundException('의존관계를 찾을 수 없습니다.');
    }
    await this.dependencyRepository.delete(dependencyId);
  }

  async findByRequirement(requirementId: number): Promise<DependencyListDto> {
    const [outgoing, incoming] = await Promise.all([
      this.dependencyRepository.find({ where: { requirementId } }),
      this.dependencyRepository.find({
        where: { targetRequirementId: requirementId },
      }),
    ]);

    const titleMap = await this.loadTitles([
      ...outgoing.map((d) => d.targetRequirementId),
      ...incoming.map((d) => d.requirementId),
    ]);

    return {
      outgoing: outgoing.map(
        (d): DependencyItem => ({
          id: d.id,
          requirementId: d.targetRequirementId,
          title: titleMap.get(d.targetRequirementId) ?? '',
          type: d.type,
          createdAt: d.createdAt as unknown as string,
        }),
      ),
      incoming: incoming.map(
        (d): DependencyItem => ({
          id: d.id,
          requirementId: d.requirementId,
          title: titleMap.get(d.requirementId) ?? '',
          type: d.type,
          createdAt: d.createdAt as unknown as string,
        }),
      ),
    };
  }

  async getImpact(requirementId: number): Promise<ImpactAnalysisDto> {
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId },
    });
    if (!requirement) {
      throw new NotFoundException('요구사항을 찾을 수 없습니다.');
    }

    const [traceability, dependencies] = await Promise.all([
      this.traceabilityRecordRepository.findOne({ where: { requirementId } }),
      this.findByRequirement(requirementId),
    ]);

    return {
      requirementId,
      linkedCodeFiles: traceability?.linkedCodeFiles ?? [],
      linkedDocuments: traceability?.linkedDocuments ?? [],
      linkedBuilds: traceability?.linkedBuilds ?? [],
      linkedTests: traceability?.linkedTests ?? [],
      outgoingDependencies: dependencies.outgoing,
      incomingDependencies: dependencies.incoming,
    };
  }

  private async loadTitles(ids: number[]): Promise<Map<number, string>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map();

    const requirements = await this.requirementRepository.find({
      where: { id: In(uniqueIds) },
      select: ['id', 'title'],
    });
    return new Map(requirements.map((r) => [r.id, r.title]));
  }
}
