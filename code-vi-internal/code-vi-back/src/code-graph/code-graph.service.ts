import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CodeUnit } from './entity/code-unit.entity';
import { CodeRelation } from './entity/code-relation.entity';
import { Finding } from './entity/finding.entity';
import { CodeGraphInputDto } from './dto/code-graph-input.dto';
import { METRIC_CATALOG } from './metric-catalog';

@Injectable()
export class CodeGraphService {
  private readonly logger = new Logger(CodeGraphService.name);

  constructor(
    @InjectRepository(CodeUnit) private readonly unitRepo: Repository<CodeUnit>,
    @InjectRepository(CodeRelation) private readonly relRepo: Repository<CodeRelation>,
    @InjectRepository(Finding) private readonly findingRepo: Repository<Finding>,
  ) {}

  /**
   * 캐노니컬 코드그래프를 snapshot에 적재 (flat insert, parentKey로 계층 표현).
   * 같은 트랜잭션 manager로 호출 가능.
   */
  async ingest(manager: any, snapshotId: number, dto: CodeGraphInputDto): Promise<number> {
    if (!dto?.units?.length) return 0;

    const units = dto.units.map((u) =>
      manager.create(CodeUnit, {
        snapshotId,
        unitKey: u.id,
        kind: u.kind,
        language: u.language,
        name: u.name,
        qualname: u.qualname ?? null,
        file: u.file ?? null,
        parentKey: u.parentId ?? null,
        range: u.range ?? null,
        attributes: u.attributes ?? null,
        metrics: u.metrics ?? null,
        metadata: u.metadata ?? null,
      }),
    );
    await manager.save(units);

    if (dto.relations?.length) {
      const rels = dto.relations.map((r) =>
        manager.create(CodeRelation, {
          snapshotId,
          kind: r.kind,
          sourceKey: r.sourceId,
          targetKey: r.targetId,
        }),
      );
      await manager.save(rels);
    }

    if (dto.findings?.length) {
      const findings = dto.findings.map((f) =>
        manager.create(Finding, {
          snapshotId,
          detector: f.detector,
          category: f.category,
          entityKey: f.entityId ?? null,
          file: f.location?.file ?? null,
          line: f.location?.line ?? null,
          severity: f.severity ?? 'medium',
          metrics: f.metrics ?? null,
          message: f.message ?? null,
          language: f.backend?.language ?? dto.language ?? null,
        }),
      );
      await manager.save(findings);
    }

    this.logger.log(
      `CodeGraph ingested: snapshot=${snapshotId}, units=${dto.units.length}, relations=${dto.relations?.length ?? 0}, findings=${dto.findings?.length ?? 0}`,
    );
    return dto.units.length;
  }

  /** snapshot의 캐노니컬 그래프 + 카탈로그 조회 (언어 균일 응답). */
  async getGraph(snapshotId: number) {
    const units = await this.unitRepo.find({ where: { snapshotId } });
    if (units.length === 0) {
      throw new NotFoundException(`No code graph for snapshot ${snapshotId}`);
    }
    const relations = await this.relRepo.find({ where: { snapshotId } });
    const findings = await this.findingRepo.find({ where: { snapshotId } });
    const language = units[0]?.language ?? null;

    return {
      snapshotId,
      language,
      units,
      relations,
      findings,
      catalog: METRIC_CATALOG,
    };
  }
}
