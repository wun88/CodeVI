import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';

// Entities
import { AstSnapshot } from './entity/ast-snapshot.entity';
import { AstDirectory } from './entity/ast-directory.entity';
import { AstFile } from './entity/ast-file.entity';
import { AstClass } from './entity/ast-class.entity';
import { AstFunction } from './entity/ast-function.entity';
import { TeamProject } from 'src/team-project/entities/team-project.entity';
import { CodeAnalysis } from 'src/code-analysis/entities/code-analysis.entity';
import { CodeMappingService } from '../requirements/code-mapping.service';
import { NvidiaLlmService } from '../llm/nvidia-llm.service';
import { LlmGenerationError } from '../llm/llm.errors';

// DTOs
import {
  CreateRelationalAstDto,
  AstNodeInputDto,
} from './dto/create-relational-ast.dto';
import {
  AiRefactoringSuggestDto,
  AiRefactoringSuggestionDto,
  AiRefactoringSuggestionText,
} from './dto/ai-refactoring-suggest.dto';
import {
  AstNodeFeedbackType,
  NodeFeedbackRequestDto,
  NodeFeedbackResponseDto,
} from './dto/node-feedback.dto';

/** code_analysis.pyExamineResult에 실려 오는 PyExamine finding 원본 형태. */
interface PyExamineSmell {
  type?: string; // 예: 'Architecture Smell' | 'Structural Smell' | 'Code Smell'
  name?: string;
  description?: string;
  file?: string;
  'Module/Class'?: string;
  lineNumber?: number;
  severity?: string;
}

/** PyExamine 3단 분류(총 49개 룰) — finding.type 문자열을 정규화한 레벨. */
type SmellLevel = 'architecture' | 'structure' | 'code';

interface DispatchedSmell {
  name: string;
  severity: string;
  message?: string;
  entity?: string;
  lineNumber?: number;
}

type DispatchedSmells = Record<SmellLevel, DispatchedSmell[]>;

@Injectable()
export class AstRelationalService {
  private readonly logger = new Logger(AstRelationalService.name);

  constructor(
    @InjectRepository(AstSnapshot)
    private readonly snapshotRepo: Repository<AstSnapshot>,

    @InjectRepository(AstDirectory)
    private readonly directoryRepo: Repository<AstDirectory>,

    @InjectRepository(AstFile)
    private readonly fileRepo: Repository<AstFile>,

    @InjectRepository(AstClass)
    private readonly classRepo: Repository<AstClass>,

    @InjectRepository(AstFunction)
    private readonly functionRepo: Repository<AstFunction>,

    @InjectRepository(TeamProject)
    private readonly teamProjectRepo: Repository<TeamProject>,

    private readonly dataSource: DataSource,
    private readonly codeMappingService: CodeMappingService,
    private readonly nvidiaLlmService: NvidiaLlmService,
  ) {}

  private async measure<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<{ data: T; latencyMs: number; memKb: number }> {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    const data = await fn();

    const latency = performance.now() - start;
    const mem = Math.max(0, process.memoryUsage().heapUsed - startMem);

    this.logger.log(
      `${name} → ${latency.toFixed(2)}ms, ${(mem / 1024).toFixed(1)}KB`,
    );
    return {
      data,
      latencyMs: +latency.toFixed(2),
      memKb: Math.floor(mem / 1024),
    };
  }

  async saveAstData(dto: CreateRelationalAstDto): Promise<AstSnapshot> {
    const { jenkinsJobName, nodes } = dto;

    const project = await this.teamProjectRepo.findOneBy({
      JenkinsJobName: jenkinsJobName,
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${jenkinsJobName}`);
    }

    const resultStats = {
      jsonSaveMs: 0,
      jsonSaveMem: 0,
      relationalSaveMs: 0,
      relationalSaveMem: 0,
      snapshotId: 0,
    };
    await this.dataSource.transaction(async (manager) => {
      // 1) 스냅샷 생성
      const startJsonMem = process.memoryUsage().heapUsed;
      const startJsonSave = performance.now();
      const snapshot = manager.create(AstSnapshot, {
        teamProjectId: project.id,
        wholeJson: nodes,
      });
      const savedSnapshot = await manager.save(snapshot);
      resultStats.jsonSaveMs = performance.now() - startJsonSave;
      resultStats.jsonSaveMem = Math.max(
        0,
        process.memoryUsage().heapUsed - startJsonMem,
      );
      resultStats.snapshotId = savedSnapshot.id;

      // 2) 재귀적으로 노드들을 저장 (초기 호출 시 부모 컨텍스트는 모두 null)
      const startRelMem = process.memoryUsage().heapUsed;
      const startRelationalSave = performance.now();
      for (const node of nodes) {
        await this.processNode(manager, node, savedSnapshot.id, null);
      }
      resultStats.relationalSaveMs = performance.now() - startRelationalSave;
      resultStats.relationalSaveMem = Math.max(
        0,
        process.memoryUsage().heapUsed - startRelMem,
      );

      this.logger.log(
        `Relational AST saved: snapshotId=${savedSnapshot.id}, project=${jenkinsJobName}`,
      );
    });

    const snapshotResult = await this.getSnapshotById(resultStats.snapshotId);

    // 요구사항-코드 매핑 재계산(jej_23 Phase 7) — AST 저장 응답을 기다리게 하지 않기 위해
    // await하지 않는다(fire-and-forget). 실패해도 저장 자체는 이미 성공했으므로 로그만 남긴다.
    this.codeMappingService
      .recomputeForTeamProject(project.id)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Code mapping recompute failed for project ${project.id}: ${message}`,
        );
      });

    return Object.assign(snapshotResult, {
      jsonSaveMs: +resultStats.jsonSaveMs.toFixed(4),
      jsonSaveMem: resultStats.jsonSaveMem,
      relationalSaveMs: +resultStats.relationalSaveMs.toFixed(4),
      relationalSaveMem: resultStats.relationalSaveMem,
    });
  }

  /**
   * AST 노드를 재귀적으로 탐색하며 중첩 구조에 맞춰 부모 ID를 전달합니다.
   */
  public async processNode(
    manager: EntityManager,
    node: AstNodeInputDto,
    snapshotId: number,
    parentDirectoryId: number | null,
    fileId: number | null = null,
    currentClassId: number | null = null,
    currentFunctionId: number | null = null,
  ): Promise<void> {
    const nodeType = node.type ? node.type.toUpperCase() : '';
    const nodeName = this.extractNodeName(node);

    if (
      nodeType.includes('CLASS') ||
      nodeType.includes('FUNC') ||
      nodeType.includes('METHOD')
    ) {
      this.logger.debug(
        ` Target Found: [${nodeType}] ${nodeName} | classId:${currentClassId}, fnId:${currentFunctionId}`,
      );
    }

    switch (nodeType) {
      case 'DIRECTORY': {
        const dir = manager.create(AstDirectory, {
          name: nodeName,
          snapshotId,
          parentDirectoryId,
        });
        const savedDir = await manager.save(dir);

        if (node.children) {
          for (const child of node.children) {
            await this.processNode(manager, child, snapshotId, savedDir.id);
          }
        }
        break;
      }

      case 'FILE': {
        if (!parentDirectoryId) {
          this.logger.warn(
            `FILE node "${nodeName}" has no parent directory, skipping`,
          );
          break;
        }

        const file = manager.create(AstFile, {
          name: nodeName,
          directoryId: parentDirectoryId,
        });
        const savedFile = await manager.save(file);

        if (node.ast) {
          // 파일 내부 진입: classId, functionId 컨텍스트 초기화
          await this.processNode(
            manager,
            node.ast,
            snapshotId,
            parentDirectoryId,
            savedFile.id,
            null,
            null,
          );
        }
        break;
      }

      case 'CLASS_DEFINITION':
      case 'CLASS': {
        // tree-sitter는 'class' 키워드 토큰도 type='class'로 내보낸다 → 자식이 없으면
        // 정의가 아니라 키워드 토큰이므로 클래스 엔티티를 만들지 않고 스킵.
        if (!node.children || node.children.length === 0) {
          break;
        }
        if (!fileId) {
          this.logger.warn(
            `CLASS node "${nodeName}" has no parent file, skipping`,
          );
          break;
        }

        const cls = manager.create(AstClass, {
          name: nodeName,
          fileId,
          startLine: node.range?.start?.line ?? 0,
          startCol: node.range?.start?.col ?? 0,
          endLine: node.range?.end?.line ?? 0,
          endCol: node.range?.end?.col ?? 0,
          // 현재 위치가 함수 안이라면 parentFunctionId, 기존 클래스 안이라면 parentClassId
          parentClassId: currentFunctionId ? null : currentClassId,
          parentFunctionId: currentFunctionId,
          // 파서가 노드 원문(text)을 보내주면 그대로 저장 — 리팩토링 인사이트의 BEFORE 코드/AI
          // 프롬프트에 실제 소스를 쓸 수 있게 한다(jej_31, 2026-09-01). 안 보내면 null.
          sourceCode: node.text ?? null,
        });
        const savedClass = await manager.save(cls);

        if (node.children) {
          for (const child of node.children) {
            // 클래스 내부 진입: currentClassId 갱신, currentFunctionId 리셋
            await this.processNode(
              manager,
              child,
              snapshotId,
              parentDirectoryId,
              fileId,
              savedClass.id,
              null,
            );
          }
        }
        break;
      }

      case 'ARROW_FUNCTION':
      case 'FUNCTION_DEFINITION':
      case 'METHOD': {
        // 소속 판별
        const isTopLevel = !currentClassId && !currentFunctionId;
        const isMethod = !!currentClassId && !currentFunctionId;

        const fn = manager.create(AstFunction, {
          name: nodeName,
          startLine: node.range?.start?.line ?? 0,
          startCol: node.range?.start?.col ?? 0,
          endLine: node.range?.end?.line ?? 0,
          endCol: node.range?.end?.col ?? 0,
          // 최상단이면 fileId 부여, 메서드면 classId 부여, 중첩 함수면 parentFunctionId 부여
          fileId: isTopLevel ? fileId : null,
          classId: isMethod ? currentClassId : null,
          parentFunctionId: currentFunctionId,
          // 클래스와 동일하게 노드 원문을 저장 — 노드 상세 AI 피드백에 실제 코드를 근거로 쓰기 위함.
          sourceCode: node.text ?? null,
        });
        const savedFn = await manager.save(fn);

        if (node.children) {
          for (const child of node.children) {
            // 함수 내부 진입: currentFunctionId 갱신 (currentClassId는 유지하여 내부 클래스가 소속 파일을 알 수 있게 함)
            await this.processNode(
              manager,
              child,
              snapshotId,
              parentDirectoryId,
              fileId,
              currentClassId,
              savedFn.id,
            );
          }
        }
        break;
      }

      default:
        // 관심 없는 구문(if, for, block 등)이더라도 그 안의 함수/클래스를 찾기 위해 현재 컨텍스트를 그대로 유지하고 하위 탐색
        if (node.children) {
          for (const child of node.children) {
            await this.processNode(
              manager,
              child,
              snapshotId,
              parentDirectoryId,
              fileId,
              currentClassId,
              currentFunctionId,
            );
          }
        }
        break;
    }
  }

  /**
   * pyexamine이 계산한 클래스별 CK/OO 메트릭을 AstClass.metrics에 매핑 저장한다.
   * 매칭 키: (파일 basename, 클래스 이름). 같은 트랜잭션(manager) 안에서 호출.
   */
  async applyClassMetrics(
    manager: EntityManager,
    snapshotId: number,
    classMetrics: Array<{
      file: string;
      name: string;
      metrics: Record<string, number>;
    }> = [],
  ): Promise<number> {
    if (!classMetrics?.length) return 0;
    const base = (p: string) => (p || '').split(/[\\/]/).pop() ?? '';
    const map = new Map<string, Record<string, number>>();
    for (const cm of classMetrics) {
      if (cm?.name && cm?.metrics)
        map.set(`${base(cm.file)}::${cm.name}`, cm.metrics);
    }

    const dirs = await manager.find(AstDirectory, {
      where: { snapshotId },
      relations: ['files', 'files.classes'],
    });

    let applied = 0;
    for (const d of dirs) {
      for (const f of d.files ?? []) {
        for (const cl of f.classes ?? []) {
          const m = map.get(`${base(f.name)}::${cl.name}`);
          if (m) {
            cl.metrics = m;
            await manager.save(cl);
            applied += 1;
          }
        }
      }
    }
    this.logger.log(
      `Applied CK metrics to ${applied} classes (snapshot ${snapshotId})`,
    );
    return applied;
  }

  /**
   * 특정 스냅샷을 관계 데이터와 함께 조회 (TypeORM relations)
   */
  async getSnapshotById(snapshotId: number): Promise<AstSnapshot> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId },
      relations: [
        'directories',
        'directories.childDirectories',
        'directories.files',
        'directories.files.classes',
        'directories.files.classes.methods',
        'directories.files.fileFunctions',
        // 재귀 조회를 위한 일부 뎁스 추가 (필요시 조절)
        'directories.files.classes.methods.childFunctions',
      ],
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    // 같은 teamProject + build 의 CodeAnalysis 에서 pyexamine 스멜을 첨부 (시각화에서 노드별 매핑).
    const analysis =
      snapshot.buildNumber != null
        ? await this.dataSource.getRepository(CodeAnalysis).findOne({
            where: {
              teamProjectId: snapshot.teamProjectId,
              buildNumber: snapshot.buildNumber,
            },
            order: { id: 'DESC' },
          })
        : null;
    (snapshot as unknown as { smells: unknown }).smells =
      analysis?.pyExamineResult ?? [];

    return snapshot;
  }

  /**
   * "리팩토링 인사이트" 섹션의 후보 클래스(classIds, 프론트가 이미 CK 임계값으로 골라 화면에
   * 표시 중인 목록)에 대해 NVIDIA LLM으로 개선 방향 텍스트를 생성한다.
   * 대상 선정·메트릭·메서드 이름은 결정론적으로 계산하고, LLM은 그 사실을 근거로 한 설명 문장만
   * 생성한다 — LLM이 숫자나 대상을 만들어내지 않도록 하기 위함. AI 호출이 실패하거나 특정 클래스
   * 항목만 파싱에 실패해도 해당 항목은 기존 정적 템플릿 문구로 폴백한다(전체 요청은 실패시키지 않음).
   */
  async generateAiRefactoringSuggestions(
    teamProjectId: number,
    dto: AiRefactoringSuggestDto,
  ): Promise<AiRefactoringSuggestionDto[]> {
    const snapshot = await this.getSnapshotById(dto.snapshotId);
    if (snapshot.teamProjectId !== teamProjectId) {
      throw new NotFoundException(`Snapshot not found: ${dto.snapshotId}`);
    }

    // buildSnapshotOverview.ts(프론트)와 동일하게 최상위 directories의 files만 순회한다 —
    // 프론트가 후보를 고른 것과 같은 트리를 봐야 classIds가 항상 해석 가능하다.
    const allClasses = (snapshot.directories ?? []).flatMap((d) =>
      (d.files ?? []).flatMap((f) => f.classes ?? []),
    );
    const targetClasses = dto.classIds
      .map((id) => allClasses.find((c) => c.id === id))
      .filter((c): c is AstClass => !!c);

    if (targetClasses.length === 0) {
      return [];
    }

    const deterministic = targetClasses.map((cls) =>
      this.buildDeterministicRefactoringSuggestion(cls),
    );

    let aiTexts: Map<number, AiRefactoringSuggestionText>;
    try {
      aiTexts = await this.requestAiRefactoringTexts(targetClasses);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `AI refactoring suggestion generation failed, using fallback text: ${message}`,
      );
      aiTexts = new Map();
    }

    return deterministic.map((item) => {
      const ai = aiTexts.get(item.classId);
      return ai ? { ...item, ...ai } : item;
    });
  }

  /**
   * 시각화 화면에서 노드(디렉토리/파일/클래스/함수)를 클릭했을 때, 그 노드의 정보만 NVIDIA LLM에
   * 보내 코드 스멜·문제점·개선 방향을 항목별 리스트로 받는다(서술형 문단이 아니라 짧은 항목
   * 여러 개 — 코드 재작성은 하지 않음). 리팩토링 인사이트와 달리 결정론적 폴백이 없다 — 실패하면
   * 그대로 예외를 던져 컨트롤러가 5xx로 응답하고, 프론트가 에러 상태를 보여준다.
   */
  async generateNodeFeedback(
    teamProjectId: number,
    dto: NodeFeedbackRequestDto,
  ): Promise<NodeFeedbackResponseDto> {
    const snapshot = await this.getSnapshotById(dto.snapshotId);
    if (snapshot.teamProjectId !== teamProjectId) {
      throw new NotFoundException(`Snapshot not found: ${dto.snapshotId}`);
    }

    const directories = snapshot.directories ?? [];
    // getSnapshotById가 같은 빌드의 code_analysis.pyExamineResult를 smells로 첨부해 둔다.
    const buildSmells =
      (snapshot as unknown as { smells?: PyExamineSmell[] }).smells ?? [];
    const payload = this.buildNodeFeedbackPayload(
      directories,
      dto.nodeType,
      dto.nodeId,
      buildSmells,
    );
    if (!payload) {
      throw new NotFoundException(
        `${dto.nodeType} node not found: ${dto.nodeId}`,
      );
    }

    const systemPrompt =
      '당신은 시니어 소프트웨어 엔지니어입니다. 주어진 코드 구조 정보(JSON)만 근거로 ' +
      '코드 스멜·문제점·개선 제안을 한국어로 정리하세요. 서술형 문단이 아니라, 각 항목을 ' +
      '한 문장 이내의 짧고 명확한 텍스트로 작성하세요(불릿 기호나 번호는 붙이지 않습니다). ' +
      '코드를 새로 작성하거나 고쳐 쓰지 마세요. detectedSmells는 정적 분석기(PyExamine)가 이 ' +
      '노드에서 실제로 검출한 스멜을 architecture/structure/code 레벨로 분류한 것입니다 — ' +
      '이를 사실로 간주해 smells 항목에 레벨과 함께 반영하고, problems/suggestions도 여기에 ' +
      '근거를 두세요. sourceCode가 있는 함수/클래스는 그 코드를 실제로 근거로 삼아 구체적으로 ' +
      '작성하고, 이름·개수만 있고 소스가 전혀 없는 노드만 판단 가능한 범위 내에서 작성하며 ' +
      '근거가 정말 부족한 항목만 빈 배열로 두세요. ' +
      '다른 설명 없이 {"smells": string[], "problems": string[], "suggestions": string[]} ' +
      '형태의 JSON 객체만 출력하세요.';
    const userPrompt = JSON.stringify({ node: payload });

    let result: unknown;
    try {
      result = await this.nvidiaLlmService.generateJson(
        systemPrompt,
        userPrompt,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Node feedback generation failed: ${message}`);
      throw new LlmGenerationError(
        `Node feedback generation failed: ${message}`,
        error,
      );
    }

    const record =
      result && typeof result === 'object'
        ? (result as Record<string, unknown>)
        : {};
    const toStringList = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((s): s is string => typeof s === 'string')
        : [];
    // 디렉토리/파일처럼 근거(소스)가 부족한 노드는 프롬프트 지시대로 세 배열 모두 빈 채로
    // 응답하는 게 정상이다(판단 근거 없음) — 실패가 아니므로 여기서 던지지 않는다.
    return {
      smells: toStringList(record.smells),
      problems: toStringList(record.problems),
      suggestions: toStringList(record.suggestions),
    };
  }

  private findDirectory(
    directories: AstDirectory[],
    id: number,
  ): AstDirectory | undefined {
    return directories.find((d) => d.id === id);
  }

  private findFile(
    directories: AstDirectory[],
    id: number,
  ): AstFile | undefined {
    for (const d of directories) {
      const found = (d.files ?? []).find((f) => f.id === id);
      if (found) return found;
    }
    return undefined;
  }

  private findClass(
    directories: AstDirectory[],
    id: number,
  ): AstClass | undefined {
    for (const d of directories) {
      for (const f of d.files ?? []) {
        const found = (f.classes ?? []).find((c) => c.id === id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /** 메서드/파일-레벨 함수/중첩 함수를 모두 뒤져 id로 찾는다. 클래스 소속이면 클래스명도 같이 반환. */
  private findFunction(
    directories: AstDirectory[],
    id: number,
  ): { fn: AstFunction; className?: string } | undefined {
    const flattenFns = (fns: AstFunction[]): AstFunction[] =>
      fns.flatMap((fn) => [fn, ...flattenFns(fn.childFunctions ?? [])]);

    for (const d of directories) {
      for (const f of d.files ?? []) {
        for (const cls of f.classes ?? []) {
          const found = flattenFns(cls.methods ?? []).find(
            (fn) => fn.id === id,
          );
          if (found) return { fn: found, className: cls.name };
        }
        const found = flattenFns(f.fileFunctions ?? []).find(
          (fn) => fn.id === id,
        );
        if (found) return { fn: found };
      }
    }
    return undefined;
  }

  /** finding.type 문자열을 architecture/structure/code 3단 레벨로 정규화한다. */
  private normalizeSmellLevel(type?: string): SmellLevel {
    const t = (type ?? '').toLowerCase();
    if (t.includes('archit')) return 'architecture';
    if (t.includes('struct') || t.includes('design')) return 'structure';
    return 'code';
  }

  /** 디렉토리 id → 루트부터의 전체 경로("src/llm" 등). 파일 경로 매칭의 기준이 된다. */
  private buildDirPathMap(directories: AstDirectory[]): Map<number, string> {
    const byId = new Map(directories.map((d) => [d.id, d]));
    const paths = new Map<number, string>();
    const pathOf = (d: AstDirectory): string => {
      const cached = paths.get(d.id);
      if (cached) return cached;
      const parent =
        d.parentDirectoryId != null ? byId.get(d.parentDirectoryId) : undefined;
      const p = parent ? `${pathOf(parent)}/${d.name}` : d.name;
      paths.set(d.id, p);
      return p;
    };
    directories.forEach((d) => pathOf(d));
    return paths;
  }

  /**
   * 빌드 단위로 저장된 PyExamine finding들을 클릭된 노드에 매핑(dispatch)한다.
   * - 경로: finding.file(./ 접두 제거)과 노드 소속 파일의 전체 경로 비교, 디렉토리는 prefix 롤업
   * - 라인: 노드/finding 양쪽에 라인 정보가 있을 때만 겹침 검사(0은 정보 없음으로 취급, 관대한 매칭)
   * - 엔티티: finding['Module/Class']와 노드 이름 비교
   * 매칭된 finding은 type 기준 3단 레벨(architecture/structure/code)로 분류해 반환한다.
   */
  private dispatchSmellsForNode(
    directories: AstDirectory[],
    smells: PyExamineSmell[],
    nodeType: AstNodeFeedbackType,
    nodeId: number,
  ): DispatchedSmells | undefined {
    if (!smells || smells.length === 0) return undefined;

    const dirPaths = this.buildDirPathMap(directories);
    const norm = (p?: string) => (p ?? '').replace(/^\.\//, '');

    const lineMatches = (
      start: number | undefined,
      end: number | undefined,
      line: number | undefined,
    ): boolean => {
      // 라인 0/미지정은 "정보 없음" — 라인으로 거르지 않는다(관대한 매칭).
      if (!line || !start || start <= 0) return true;
      return line >= start && line <= (end && end > 0 ? end : start);
    };

    let matches: PyExamineSmell[] = [];
    if (nodeType === 'directory') {
      const dirPath = dirPaths.get(nodeId);
      if (dirPath == null) return undefined;
      matches = smells.filter((s) => norm(s.file).startsWith(`${dirPath}/`));
    } else if (nodeType === 'file') {
      for (const d of directories) {
        const file = (d.files ?? []).find((f) => f.id === nodeId);
        if (file) {
          const filePath = `${dirPaths.get(d.id)}/${file.name}`;
          matches = smells.filter((s) => norm(s.file) === filePath);
          break;
        }
      }
    } else if (nodeType === 'class') {
      for (const d of directories) {
        for (const f of d.files ?? []) {
          const cls = (f.classes ?? []).find((c) => c.id === nodeId);
          if (!cls) continue;
          const filePath = `${dirPaths.get(d.id)}/${f.name}`;
          const memberNames = new Set([
            cls.name,
            ...(cls.methods ?? []).map((m) => m.name),
          ]);
          matches = smells.filter(
            (s) =>
              norm(s.file) === filePath &&
              (memberNames.has(s['Module/Class'] ?? '') ||
                lineMatches(cls.startLine, cls.endLine, s.lineNumber)),
          );
        }
      }
    } else {
      const found = this.findFunction(directories, nodeId);
      if (!found) return undefined;
      for (const d of directories) {
        for (const f of d.files ?? []) {
          const owns =
            (f.fileFunctions ?? []).some((fn) => fn.id === nodeId) ||
            (f.classes ?? []).some((c) =>
              (c.methods ?? []).some((m) => m.id === nodeId),
            );
          if (!owns) continue;
          const filePath = `${dirPaths.get(d.id)}/${f.name}`;
          matches = smells.filter(
            (s) =>
              norm(s.file) === filePath &&
              (s['Module/Class'] === found.fn.name ||
                lineMatches(
                  found.fn.startLine,
                  found.fn.endLine,
                  s.lineNumber,
                )),
          );
        }
      }
    }

    if (matches.length === 0) return undefined;

    const grouped: DispatchedSmells = {
      architecture: [],
      structure: [],
      code: [],
    };
    const MAX_PER_LEVEL = 15;
    for (const s of matches) {
      const level = this.normalizeSmellLevel(s.type);
      if (grouped[level].length >= MAX_PER_LEVEL) continue;
      grouped[level].push({
        name: s.name ?? 'unknown',
        severity: (s.severity ?? 'medium').toLowerCase(),
        message: s.description,
        entity: s['Module/Class'] || undefined,
        lineNumber: s.lineNumber && s.lineNumber > 0 ? s.lineNumber : undefined,
      });
    }
    return grouped;
  }

  private buildNodeFeedbackPayload(
    directories: AstDirectory[],
    nodeType: AstNodeFeedbackType,
    nodeId: number,
    smells: PyExamineSmell[],
  ): Record<string, unknown> | null {
    // 빌드 단위(code_analysis.pyExamineResult)로 저장된 정적 분석 스멜을 이 노드로 dispatch —
    // LLM이 임계값을 다시 추측하는 대신 분석기가 이미 찾은 스멜을 근거로 쓰게 한다.
    const detectedSmells = this.dispatchSmellsForNode(
      directories,
      smells,
      nodeType,
      nodeId,
    );

    if (nodeType === 'directory') {
      const dir = this.findDirectory(directories, nodeId);
      if (!dir) return null;
      return {
        type: 'directory',
        name: dir.name,
        childDirectoryCount: directories.filter(
          (d) => d.parentDirectoryId === dir.id,
        ).length,
        fileCount: (dir.files ?? []).length,
        classCount: (dir.files ?? []).flatMap((f) => f.classes ?? []).length,
        detectedSmells,
        note: '디렉토리는 소스 코드가 없는 구조적 단위이며, 이름과 하위 구성 개수만 제공됩니다.',
      };
    }
    if (nodeType === 'file') {
      const file = this.findFile(directories, nodeId);
      if (!file) return null;
      // 클래스는 이름·메트릭·메서드 수만(전체 소스는 클래스 노드에서 따로 받게 함), 파일 직속
      // 함수는 짧으니 실제 소스를 통째로 줘서 "파일에 섞인 유틸 함수" 같은 파일 레벨 스멜을
      // 판단할 근거를 충분히 준다.
      const classes = (file.classes ?? []).map((c) => ({
        name: c.name,
        metrics: c.metrics ?? undefined,
        methodCount: (c.methods ?? []).length,
      }));
      const functions = (file.fileFunctions ?? []).map((fn) => ({
        name: fn.name,
        sourceCode: fn.sourceCode
          ? this.excerptSource(fn.sourceCode, 40)
          : undefined,
      }));
      return {
        type: 'file',
        name: file.name,
        classes,
        functions,
        detectedSmells,
      };
    }
    if (nodeType === 'class') {
      const cls = this.findClass(directories, nodeId);
      if (!cls) return null;
      return {
        type: 'class',
        name: cls.name,
        metrics: cls.metrics ?? {},
        methods: (cls.methods ?? []).map((m) => m.name).slice(0, 30),
        sourceCode: cls.sourceCode
          ? this.excerptSource(cls.sourceCode, 120)
          : undefined,
        detectedSmells,
      };
    }
    const found = this.findFunction(directories, nodeId);
    if (!found) return null;
    return {
      type: 'function',
      name: found.fn.name,
      className: found.className,
      lineCount: Math.max(0, found.fn.endLine - found.fn.startLine + 1),
      sourceCode: found.fn.sourceCode
        ? this.excerptSource(found.fn.sourceCode, 80)
        : undefined,
      detectedSmells,
    };
  }

  /** LCOM/CBO/WMC 값만으로 결정론적으로 구성하는 기본 제안 — AI 미가용 시 폴백으로도 쓰인다. */
  private buildDeterministicRefactoringSuggestion(
    cls: AstClass,
  ): AiRefactoringSuggestionDto {
    const metrics = cls.metrics ?? {};
    const lcom = metrics.lcom ?? 0;
    const cbo = metrics.cbo ?? 0;
    const wmc = metrics.wmc ?? 0;

    const detailExplanation =
      lcom > 50
        ? 'LCOM이 높아 클래스 내 메서드가 서로 다른 데이터를 다루는 경향이 있습니다. 응집도를 높이기 위해 역할을 분리하세요.'
        : cbo > 6
          ? '다른 클래스와의 결합(CBO)이 높습니다. 의존 방향을 줄이거나 중재 레이어를 도입하는 것을 검토하세요.'
          : '메서드 수·복잡도(WMC)가 큽니다. 긴 메서드 분할과 단일 책임 원칙 적용을 권장합니다.';
    const problemSummary =
      lcom > 50
        ? `응집도 저하: ${cls.name}에서 LCOM이 높습니다.`
        : cbo > 6
          ? `결합 과다: ${cls.name}의 CBO가 높습니다.`
          : `복잡도 과다: ${cls.name}의 WMC가 큽니다.`;
    const effectSummary =
      lcom > 50
        ? '역할 분리 시 변경 범위 축소·테스트 용이성 향상을 기대할 수 있습니다.'
        : cbo > 6
          ? '의존 축소 시 리그레션 범위와 배포 리스크를 줄일 수 있습니다.'
          : '메서드 분할 시 가독성과 단위 테스트 작성이 쉬워집니다.';
    const severity: 'risk' | 'improve' =
      wmc > 16 || cbo > 9 || lcom > 70 ? 'risk' : 'improve';
    const effectHighlights = effectSummary
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);

    return {
      classId: cls.id,
      targetLabel: cls.name,
      problemCode: cls.sourceCode
        ? this.excerptSource(cls.sourceCode)
        : `// ${cls.name}: LCOM ${lcom}, CBO ${cbo}, WMC ${wmc}\n// 높은 결합·응집도 저하 가능성`,
      problemSummary,
      improvedCode:
        '// 책임 분리 또는 서비스 추출로 메서드 그룹을 나눕니다.\n// private 헬퍼 추출, 인터페이스 도입 검토',
      effectSummary,
      detailExplanation,
      severity,
      effectHighlights,
      metrics: { cbo, wmc, lcom },
    };
  }

  /**
   * 원본 소스가 너무 길면(전체 파일 등) UI/프롬프트에 그대로 쓰기엔 과하므로 앞부분만 잘라
   * 보여준다 — "문제 코드"는 대표성만 있으면 충분하고, 전체 파일 스크롤은 UX상 부담스럽다.
   */
  private excerptSource(source: string, maxLines = 60): string {
    const lines = source.split('\n');
    if (lines.length <= maxLines) return source;
    return (
      lines.slice(0, maxLines).join('\n') +
      `\n// ... (총 ${lines.length}줄 중 ${maxLines}줄만 표시)`
    );
  }

  /** 대상 클래스들의 실제 메트릭·메서드 이름(+가능하면 실제 소스 발췌)을 근거로 NVIDIA LLM에 개선 설명 문장 생성을 요청한다. */
  private async requestAiRefactoringTexts(
    classes: AstClass[],
  ): Promise<Map<number, AiRefactoringSuggestionText>> {
    const systemPrompt =
      '당신은 시니어 소프트웨어 엔지니어입니다. 주어진 클래스의 실제 메트릭·메서드 목록·(있다면) 실제 ' +
      '소스 코드 발췌만 근거로 리팩토링 방향을 한국어로 제안하세요. sourceCode가 주어진 클래스는 그 코드에 ' +
      '실제로 등장하는 이름·구조를 근거로 구체적인 개선 코드를 improvedCode에 작성하고, sourceCode가 없는 ' +
      '클래스는 실행 가능한 코드가 아니라 의사코드 수준의 리팩토링 방향(주석 형태)을 작성하세요. 다른 설명 ' +
      '없이 JSON 배열만 출력하세요.';

    const userPrompt = JSON.stringify({
      instruction:
        '아래 classes 배열의 각 클래스에 대해 정확히 하나씩, ' +
        '{ "classId": number, "improvedCode": string, "effectSummary": string, ' +
        '"detailExplanation": string, "effectHighlights": string[] } 형태의 객체로 이루어진 ' +
        'JSON 배열을 반환하세요. effectHighlights는 effectSummary 안에서 강조할 핵심 어구 1~2개입니다.',
      classes: classes.map((cls) => ({
        classId: cls.id,
        className: cls.name,
        metrics: cls.metrics ?? {},
        methods: (cls.methods ?? []).map((m) => m.name).slice(0, 30),
        sourceCode: cls.sourceCode
          ? this.excerptSource(cls.sourceCode, 120)
          : undefined,
      })),
    });

    const result = await this.nvidiaLlmService.generateJson(
      systemPrompt,
      userPrompt,
    );
    if (!Array.isArray(result)) {
      throw new LlmGenerationError('NVIDIA response was not a JSON array');
    }

    const map = new Map<number, AiRefactoringSuggestionText>();
    for (const item of result as unknown[]) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      if (
        typeof record.classId === 'number' &&
        typeof record.improvedCode === 'string' &&
        typeof record.effectSummary === 'string' &&
        typeof record.detailExplanation === 'string'
      ) {
        map.set(record.classId, {
          improvedCode: record.improvedCode,
          effectSummary: record.effectSummary,
          detailExplanation: record.detailExplanation,
          effectHighlights: Array.isArray(record.effectHighlights)
            ? record.effectHighlights.filter(
                (h): h is string => typeof h === 'string',
              )
            : [],
        });
      }
    }
    return map;
  }

  /**
   * QueryBuilder를 이용한 Natural Join 방식 조회
   */
  async getSnapshotByNaturalJoin(
    snapshotId: number,
  ): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('NaturalJoin', () =>
      this.snapshotRepo
        .createQueryBuilder('snapshot')
        .leftJoinAndSelect('snapshot.directories', 'dir')
        .leftJoinAndSelect('dir.files', 'file')
        .leftJoinAndSelect('file.classes', 'cls')
        .leftJoinAndSelect('cls.methods', 'method')
        .leftJoinAndSelect('file.fileFunctions', 'fileFn')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne(),
    );
    if (!measured.data) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }
    return Object.assign(measured.data, {
      latencyMs: measured.latencyMs,
      memKb: measured.memKb,
    });
  }

  /**
   * 원본 JSON 데이터만 조회
   */
  async getSnapshotByWholeJson(
    snapshotId: number,
  ): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('WholeJson', () =>
      this.snapshotRepo
        .createQueryBuilder('snapshot')
        .addSelect('snapshot.wholeJson')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne(),
    );

    if (!measured.data) {
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);
    }

    return Object.assign(measured.data, {
      latencyMs: measured.latencyMs,
      memKb: measured.memKb,
    });
  }

  /**
   * Nested SQL (서브쿼리) 방식 조회 및 애플리케이션 레벨 조립
   */
  async getSnapshotByNested(
    snapshotId: number,
  ): Promise<AstSnapshot & { latencyMs: number; memKb: number }> {
    const measured = await this.measure('Nested', () =>
      this.snapshotRepo
        .createQueryBuilder('snapshot')
        .where('snapshot.id = :id', { id: snapshotId })
        .getOne(),
    );

    if (!measured.data)
      throw new NotFoundException(`Snapshot not found: ${snapshotId}`);

    // 1) 디렉토리 조회
    const directories = await this.directoryRepo
      .createQueryBuilder('dir')
      .where(
        `dir.snapshotId IN (${this.snapshotRepo
          .createQueryBuilder('s')
          .select('s.id')
          .where('s.id = :id')
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 2) 파일 조회
    const files = await this.fileRepo
      .createQueryBuilder('file')
      .where(
        `file.directoryId IN (${this.directoryRepo
          .createQueryBuilder('d')
          .select('d.id')
          .where('d.snapshotId = :id')
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 3) 클래스 조회
    const classes = await this.classRepo
      .createQueryBuilder('cls')
      .where(
        `cls.fileId IN (${this.fileRepo
          .createQueryBuilder('f')
          .select('f.id')
          .where(
            `f.directoryId IN (${this.directoryRepo
              .createQueryBuilder('d2')
              .select('d2.id')
              .where('d2.snapshotId = :id')
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 4) 함수 조회 (파일 레벨 + 클래스 메서드)
    const functions = await this.functionRepo
      .createQueryBuilder('fn')
      .where(
        `fn.fileId IN (${this.fileRepo
          .createQueryBuilder('f2')
          .select('f2.id')
          .where(
            `f2.directoryId IN (${this.directoryRepo
              .createQueryBuilder('d3')
              .select('d3.id')
              .where('d3.snapshotId = :id')
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .orWhere(
        `fn.classId IN (${this.classRepo
          .createQueryBuilder('c2')
          .select('c2.id')
          .where(
            `c2.fileId IN (${this.fileRepo
              .createQueryBuilder('f3')
              .select('f3.id')
              .where(
                `f3.directoryId IN (${this.directoryRepo
                  .createQueryBuilder('d4')
                  .select('d4.id')
                  .where('d4.snapshotId = :id')
                  .getQuery()})`,
              )
              .getQuery()})`,
          )
          .getQuery()})`,
      )
      .setParameters({ id: snapshotId })
      .getMany();

    // 5) 메모리에서 트리 구조 조립
    const classMap = new Map<number, AstClass & { methods: AstFunction[] }>();
    classes.forEach((cls) => classMap.set(cls.id, { ...cls, methods: [] }));

    functions.forEach((fn) => {
      if (fn.classId && classMap.has(fn.classId)) {
        classMap.get(fn.classId)!.methods.push(fn);
      }
    });

    const fileMap = new Map<
      number,
      AstFile & { classes: any[]; fileFunctions: AstFunction[] }
    >();
    files.forEach((file) =>
      fileMap.set(file.id, { ...file, classes: [], fileFunctions: [] }),
    );

    classMap.forEach((cls) => {
      if (fileMap.has(cls.fileId)) fileMap.get(cls.fileId)!.classes.push(cls);
    });

    functions.forEach((fn) => {
      if (fn.fileId && !fn.classId && fileMap.has(fn.fileId)) {
        fileMap.get(fn.fileId)!.fileFunctions.push(fn);
      }
    });

    const dirMap = new Map<
      number,
      AstDirectory & { files: any[]; childDirectories: any[] }
    >();
    directories.forEach((dir) =>
      dirMap.set(dir.id, { ...dir, files: [], childDirectories: [] }),
    );

    fileMap.forEach((file) => {
      if (dirMap.has(file.directoryId))
        dirMap.get(file.directoryId)!.files.push(file);
    });

    const rootDirectories: (AstDirectory & {
      files: any[];
      childDirectories: any[];
    })[] = [];
    // 디렉토리 계층 구조 복원
    dirMap.forEach((dir) => {
      if (dir.parentDirectoryId && dirMap.has(dir.parentDirectoryId)) {
        // 부모가 있으면 부모의 childDirectories에 추가
        dirMap.get(dir.parentDirectoryId)!.childDirectories.push(dir);
      } else {
        // 부모가 없으면 최상위 디렉토리로 분류
        rootDirectories.push(dir);
      }
    });

    measured.data.directories = rootDirectories as unknown as AstDirectory[];
    return Object.assign(measured.data, {
      latencyMs: measured.latencyMs,
      memKb: measured.memKb,
    });
  }

  /**
   * 전체 스냅샷 목록 조회
   */
  async getAllSnapshots(): Promise<AstSnapshot[]> {
    return this.snapshotRepo.find({
      relations: [
        'directories',
        'directories.childDirectories',
        'directories.files',
        'directories.files.classes',
        'directories.files.classes.methods',
        'directories.files.fileFunctions',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 프로젝트 하나의 스냅샷 요약 목록 — ProjectDetail "코드 품질" 탭용 (jej_23 Phase 12 후속).
   * getAllSnapshots()는 전체 프로젝트의 전체 관계(디렉토리~함수)를 매번 통째로 로드해 매우
   * 무거운데, 이 화면은 프로젝트 하나·요약 필드만 필요해 관계 없이 가볍게 조회한다.
   */
  async getSnapshotSummariesForProject(
    teamProjectId: number,
  ): Promise<
    Pick<
      AstSnapshot,
      'id' | 'buildNumber' | 'buildUrl' | 'createdAt' | 'teamProjectId'
    >[]
  > {
    return this.snapshotRepo.find({
      where: { teamProjectId },
      select: ['id', 'buildNumber', 'buildUrl', 'createdAt', 'teamProjectId'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * [수정됨] 노드에서 이름을 우아하게 추출하는 헬퍼 메서드
   */
  private extractNodeName(node: AstNodeInputDto): string {
    // 1. 명시적인 이름이 있는 경우
    if (node.name && node.name !== 'undefined' && node.name !== 'null') {
      return node.name;
    }

    // 2. 자식 노드에서 Identifier(식별자)를 찾을 수 있는 경우
    if (node.children && Array.isArray(node.children)) {
      const nameNode = node.children.find((c) => c.fieldName === 'name');
      if (nameNode && nameNode.text) return nameNode.text;

      const idNode = node.children.find(
        (c) =>
          c.type &&
          (c.type.toLowerCase().includes('identifier') ||
            c.type.toLowerCase() === 'name'),
      );
      if (idNode && idNode.text) return idNode.text;
    }

    // 3. ⭐️ 이름이 없는 익명 함수/클래스인 경우 (위치 기반 식별자 자동 부여)
    const nodeType = (node.type || 'unknown').toLowerCase();
    const isTargetNode =
      nodeType.includes('func') ||
      nodeType.includes('method') ||
      nodeType.includes('class');

    if (isTargetNode) {
      const line = node.range?.start?.line ?? '0';
      const col = node.range?.start?.col ?? '0';
      // 에러 방지 및 완벽한 추적 가능성 확보: 예) <anonymous_function_L15_C20>
      return `<anonymous_${nodeType}_L${line}_C${col}>`;
    }

    // 4. 일반 무명 노드의 텍스트 폴백 (안전을 위해 최대 50자 제한)
    const fallbackText =
      node.text && node.text !== 'undefined' && node.text !== 'null'
        ? node.text
        : 'Unknown_Node';

    return fallbackText.length > 50
      ? fallbackText.substring(0, 47) + '...'
      : fallbackText;
  }
}
