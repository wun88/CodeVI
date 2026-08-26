import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Requirement } from './entities/requirement.entity';
import { GeneratedDocument } from './entities/generated-document.entity';
import { TraceabilityRecord } from './entities/traceability-record.entity';
import { TeamProject } from '../team-project/entities/team-project.entity';
import {
  computeQualityCheck,
  DocumentQualityCheck,
  generateDocumentSections,
  TraceabilityLookup,
} from './lib/document-generator';
import { GenerateDocumentDto } from './dto/document.dto';

/**
 * 요구사항 기반 템플릿 문서(SRS/PRD/BRS) 생성/편집/재생성/품질체크 (jej_23 Phase 9).
 * ReqFlow src/mocks/documentGenerator.ts의 "AI 재생성"은 실제로는 목업 텍스트를 덧붙이는
 * 가짜 동작이었다 — 여기서는 그 문구를 "템플릿 재생성"으로 바로잡고, 실제로 현재 요구사항
 * 데이터를 다시 계산해 해당 섹션만 갱신하는 정직한 재생성으로 대체한다.
 */
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(GeneratedDocument)
    private readonly documentRepository: Repository<GeneratedDocument>,
    @InjectRepository(Requirement)
    private readonly requirementRepository: Repository<Requirement>,
    @InjectRepository(TraceabilityRecord)
    private readonly traceabilityRecordRepository: Repository<TraceabilityRecord>,
    @InjectRepository(TeamProject)
    private readonly teamProjectRepository: Repository<TeamProject>,
  ) {}

  private async loadTraceability(
    requirementIds: number[],
  ): Promise<TraceabilityLookup> {
    if (requirementIds.length === 0) return new Map();
    const records = await this.traceabilityRecordRepository.find({
      where: { requirementId: In(requirementIds) },
    });
    return new Map(
      records.map((r) => [
        r.requirementId,
        {
          hasCode: r.linkedCodeFiles.length > 0,
          hasTest: r.linkedTests.length > 0,
        },
      ]),
    );
  }

  async generate(
    teamProjectId: number,
    dto: GenerateDocumentDto,
  ): Promise<GeneratedDocument> {
    const teamProject = await this.teamProjectRepository.findOne({
      where: { id: teamProjectId },
    });
    if (!teamProject) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    const requirements = await this.requirementRepository.find({
      where: { id: In(dto.requirementIds), teamProjectId },
    });
    if (requirements.length === 0) {
      throw new BadRequestException('선택한 요구사항을 찾을 수 없습니다.');
    }

    const includeTraceability = dto.includeTraceability ?? true;
    const includeNfr = dto.includeNfr ?? true;
    const traceability = await this.loadTraceability(
      requirements.map((r) => r.id),
    );
    const { title, sections } = generateDocumentSections(
      dto.type,
      teamProject.teamName,
      requirements,
      { includeTraceability, includeNfr },
      traceability,
    );

    const document = this.documentRepository.create({
      teamProjectId,
      type: dto.type,
      title,
      sections,
      sourceRequirementIds: requirements.map((r) => r.id),
      includeTraceability,
      includeNfr,
    });
    return this.documentRepository.save(document);
  }

  async findByTeamProject(teamProjectId: number): Promise<GeneratedDocument[]> {
    return this.documentRepository.find({
      where: { teamProjectId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findOwned(
    teamProjectId: number,
    documentId: number,
  ): Promise<GeneratedDocument> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId, teamProjectId },
    });
    if (!document) {
      throw new NotFoundException('문서를 찾을 수 없습니다.');
    }
    return document;
  }

  async updateSection(
    teamProjectId: number,
    documentId: number,
    sectionId: string,
    content: string,
  ): Promise<GeneratedDocument> {
    const document = await this.findOwned(teamProjectId, documentId);
    if (!document.sections.some((s) => s.id === sectionId)) {
      throw new NotFoundException('섹션을 찾을 수 없습니다.');
    }

    document.sections = document.sections.map((s) =>
      s.id === sectionId ? { ...s, content } : s,
    );
    return this.documentRepository.save(document);
  }

  /** 템플릿 재생성 — 현재 요구사항 데이터로 해당 섹션만 다시 계산한다(AI 아님, 결정적 재계산). */
  async regenerateSection(
    teamProjectId: number,
    documentId: number,
    sectionId: string,
  ): Promise<GeneratedDocument> {
    const document = await this.findOwned(teamProjectId, documentId);

    const teamProject = await this.teamProjectRepository.findOne({
      where: { id: teamProjectId },
    });
    if (!teamProject) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    const requirements = await this.requirementRepository.find({
      where: { id: In(document.sourceRequirementIds) },
    });
    const traceability = await this.loadTraceability(
      requirements.map((r) => r.id),
    );
    const { sections } = generateDocumentSections(
      document.type,
      teamProject.teamName,
      requirements,
      {
        includeTraceability: document.includeTraceability,
        includeNfr: document.includeNfr,
      },
      traceability,
    );

    const regenerated = sections.find((s) => s.id === sectionId);
    if (!regenerated) {
      throw new NotFoundException('섹션을 찾을 수 없습니다.');
    }

    document.sections = document.sections.map((s) =>
      s.id === sectionId ? regenerated : s,
    );
    return this.documentRepository.save(document);
  }

  async getQualityCheck(
    teamProjectId: number,
    documentId: number,
  ): Promise<DocumentQualityCheck> {
    const document = await this.findOwned(teamProjectId, documentId);
    const traceability = await this.loadTraceability(
      document.sourceRequirementIds,
    );
    return computeQualityCheck(
      document.type,
      document.sections,
      document.sourceRequirementIds,
      traceability,
    );
  }
}
