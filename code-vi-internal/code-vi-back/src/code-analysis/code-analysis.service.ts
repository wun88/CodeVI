import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CodeAnalysis } from './entities/code-analysis.entity';
import { CreateCodeAnalysisDto } from './dto/create-code-analysis.dto';
import { PartialAnalysisDto } from './dto/partial-analysis.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { ExamineService } from '../examine/examine.service';

/** 스니펫을 examine 으로 보낼 때 쓰는 언어별 확장자 (AST 노드 파일명과 공유). */
const SNIPPET_EXT: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  python: 'py',
  java: 'java',
  c: 'c',
};

@Injectable()
export class CodeAnalysisService {
  private readonly logger = new Logger(CodeAnalysisService.name);
  constructor(
    @InjectRepository(CodeAnalysis)
    private readonly codeAnalysisRepository: Repository<CodeAnalysis>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly examineService: ExamineService,
  ) {}

  async createJenkinsNotification(
    dto: CreateCodeAnalysisDto,
  ): Promise<CodeAnalysis> {
    const savedAnalysis = await this.codeAnalysisRepository.save(
      this.codeAnalysisRepository.create(dto),
    );

    try {
      await this.fetchAndUpdateSonarMetrics(savedAnalysis.id, dto.jobName);
    } catch (error) {
      this.logger.error(`Failed to fetch Sonar metrics: ${error.message}`);
    }
    const result = await this.codeAnalysisRepository.findOne({
      where: { id: savedAnalysis.id },
    });
    if (!result) {
      throw new Error('Failed to retrieve saved code analysis');
    }
    return result;
  }

  private async fetchAndUpdateSonarMetrics(id: number, projectKey: string) {
    const sonarToken = this.configService.get('SONAR_TOKEN');
    const metricKeys = [
      'bugs',
      'reliability_rating',
      'reliability_remediation_effort',
      'vulnerabilities',
      'security_rating',
      'security_hotspots',
      'code_smells',
      'sqale_rating',
      'sqale_index',
      'complexity',
      'cognitive_complexity',
      'ncloc',
    ].join(',');

    const url = `http://sonarqube:9000/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}`;

    const response = await lastValueFrom(
      this.httpService.get(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(sonarToken + ':').toString('base64')}`,
        },
      }),
    );

    const measures = response.data.component.measures;
    const metricsUpdate = {};
    measures.forEach((m) => {
      metricsUpdate[m.metric] = m.value;
    });

    await this.codeAnalysisRepository.update(id, metricsUpdate);
  }

  async findAll() {
    return await this.codeAnalysisRepository.find({ order: { id: 'DESC' } });
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
  async analyzePartialCode(dto: PartialAnalysisDto) {
    const { code, language } = dto;
    const lines = code.split('\n');
    if (lines.length < 3) {
      throw new BadRequestException('Code must be at least 3 lines long.');
    }
    if (lines.length > 1000) {
      throw new BadRequestException(
        'Code must be less than 1000 lines. Please use project-level analysis instead.',
      );
    }

    let Parser;
    let languageModule;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Parser = require('tree-sitter');
      switch (language) {
        case 'typescript':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          languageModule = require('tree-sitter-typescript').typescript;
          break;
        case 'javascript':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          languageModule = require('tree-sitter-javascript');
          break;
        case 'python':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          languageModule = require('tree-sitter-python');
          break;
        case 'c':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          languageModule = require('tree-sitter-c');
          break;
        case 'java':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          languageModule = require('tree-sitter-java');
          break;
        default:
          throw new BadRequestException('Unsupported language');
      }
    } catch (e) {
      this.logger.warn('Failed to load tree-sitter or language modules. Using fallback parser.', e);
      return {
        ...this.fallbackAnalyze(code, language, lines),
        examine: await this.examineService.tryGetCodeGraph({ code }, language),
      };
    }

    const parser = new Parser();
    parser.setLanguage(languageModule);

    const tree = parser.parse(code);

    let errorCount = 0;
    let blockCount = 0;
    let totalNodes = 0;

    const traverse = (node: any) => {
      totalNodes++;
      if (node.type === 'ERROR') {
        errorCount++;
      }

      const isBlock =
        node.type.includes('function') ||
        node.type.includes('class') ||
        node.type.includes('method') ||
        node.type.includes('if') ||
        node.type.includes('for') ||
        node.type.includes('while') ||
        node.type === 'block';

      if (isBlock) {
        blockCount++;
      }

      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    };

    traverse(tree.rootNode);

    if (totalNodes > 0 && errorCount / totalNodes > 0.1) {
      throw new BadRequestException(
        'Too many syntax errors. Invalid code snippet.',
      );
    }

    if (blockCount === 0) {
      throw new BadRequestException(
        'Code must contain meaningful structures (e.g., functions, classes, control flows), not just simple declarations.',
      );
    }

    let cyclomaticComplexity = 1;
    let couplingCount = 0;
    let parameterCount = 0;

    const calculateMetrics = (node: any) => {
      const type = node.type;
      if (
        [
          'if_statement',
          'for_statement',
          'while_statement',
          'catch_clause',
          'switch_case',
          'ternary_expression',
          '&&',
          '||',
        ].includes(type) ||
        type.includes('if') ||
        type.includes('for') ||
        type.includes('while')
      ) {
        cyclomaticComplexity++;
      }

      if (type.includes('call') || type.includes('import')) {
        couplingCount++;
      }

      if (type === 'formal_parameters' || type === 'parameters') {
        parameterCount += node.namedChildCount;
      }

      for (let i = 0; i < node.childCount; i++) {
        calculateMetrics(node.child(i));
      }
    };

    calculateMetrics(tree.rootNode);

    // ── 시각화 그래프: DB 4계층(디렉토리→파일→클래스→메서드)과 동일한 구조 단위만 노드로 만든다.
    //    스니펫에는 디렉토리가 없으므로 파일(root)→클래스→메서드/함수 계층으로 내려간다.
    const CLASS_NODE_TYPES = new Set([
      'class_definition', // python
      'class_declaration', // ts/js/java
      'abstract_class_declaration', // ts
      'interface_declaration', // ts/java
      'enum_declaration', // ts/java
      'struct_specifier', // c (body 있는 정의만)
    ]);
    const FUNCTION_NODE_TYPES = new Set([
      'function_definition', // python/c
      'function_declaration', // ts/js
      'generator_function_declaration', // js
      'method_definition', // ts/js
      'method_declaration', // java
      'constructor_declaration', // java
      'arrow_function', // ts/js: const f = () => {}
      'function_expression', // js: const f = function () {}
    ]);

    const extractName = (node: any): string | null => {
      const nameNode = node.childForFieldName?.('name');
      if (nameNode) return nameNode.text;
      // c: function_definition은 declarator 체인 안에 식별자가 있다
      let cur = node.childForFieldName?.('declarator');
      for (let depth = 0; cur && depth < 10; depth++) {
        if (cur.type === 'identifier' || cur.type === 'field_identifier') return cur.text;
        cur = cur.childForFieldName?.('declarator') ?? cur.namedChild?.(0) ?? null;
      }
      // 익명 함수/화살표 함수: const f = () => {} 형태면 변수명 사용
      if (node.parent?.type === 'variable_declarator') {
        return node.parent.childForFieldName?.('name')?.text ?? null;
      }
      return null;
    };

    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeIdCounter = 0;

    const pushNode = (
      kind: 'file' | 'class' | 'method' | 'function',
      name: string,
      node: any,
      parentId: string | null,
    ): string => {
      const currentId = `node_${nodeIdCounter++}`;
      nodes.push({
        id: currentId,
        type: 'astNode',
        data: {
          kind,
          name,
          label: node.type,
          text: name,
          startPosition: node.startPosition,
          endPosition: node.endPosition,
        },
      });
      if (parentId) {
        edges.push({ id: `edge_${parentId}_${currentId}`, source: parentId, target: currentId });
      }
      return currentId;
    };

    const rootId = pushNode('file', `snippet.${SNIPPET_EXT[language] ?? language}`, tree.rootNode, null);

    const walkStructure = (node: any, parentId: string, insideClass: boolean) => {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (CLASS_NODE_TYPES.has(child.type) && child.childForFieldName?.('body')) {
          const classId = pushNode('class', extractName(child) ?? child.type, child, parentId);
          walkStructure(child, classId, true);
        } else if (FUNCTION_NODE_TYPES.has(child.type)) {
          const name = extractName(child);
          // 이름을 못 찾는 인라인 콜백(익명 화살표 등)은 노드로 만들지 않고 통과
          if (name === null && (child.type === 'arrow_function' || child.type === 'function_expression')) {
            walkStructure(child, parentId, insideClass);
            continue;
          }
          const fnId = pushNode(insideClass ? 'method' : 'function', name ?? child.type, child, parentId);
          // 함수 내부로 들어가면 클래스 컨텍스트를 벗어난다(중첩 함수는 function)
          walkStructure(child, fnId, false);
        } else {
          walkStructure(child, parentId, insideClass);
        }
      }
    };
    walkStructure(tree.rootNode, rootId, false);

    return {
      metrics: {
        cyclomaticComplexity,
        couplingCount,
        parameterCount,
        totalLines: lines.length,
      },
      ast: {
        nodes,
        edges,
      },
      // examine 컨테이너 응답(units/relations/findings/catalog)을 가공 없이 그대로 전달한다.
      // 미배포 언어(EXAMINE_LANGUAGES)이거나 컨테이너 장애면 null — 스니펫 분석 자체는 성립한다.
      examine: await this.examineService.tryGetCodeGraph({ code }, language),
    };
  }

  private fallbackAnalyze(code: string, language: string, lines: string[]) {
    // A simple regex-based structural analyzer for environments where tree-sitter native bindings fail to build
    let cyclomaticComplexity = 1;
    let couplingCount = 0;
    let parameterCount = 0;
    let blockCount = 0;

    const nodes: any[] = [];
    const edges: any[] = [];

    // Root node
    nodes.push({
      id: 'node_0',
      type: 'astNode',
      data: { label: 'program', text: 'Program Root', startPosition: { row: 0, column: 0 }, endPosition: { row: lines.length, column: 0 } },
    });

    lines.forEach((line, index) => {
      let type = '';
      let label = '';
      let isBlock = false;

      if (line.match(/\b(function|class)\b/)) {
        type = line.includes('function') ? 'function_declaration' : 'class_declaration';
        label = line.trim().substring(0, 20);
        isBlock = true;
        blockCount++;
      } else if (line.match(/\b(if|for|while|switch|catch)\b/)) {
        cyclomaticComplexity++;
        type = 'control_statement';
        label = line.trim().substring(0, 20);
        isBlock = true;
      } else if (line.match(/\b(import|require)\b/)) {
        couplingCount++;
        type = 'import_statement';
        label = line.trim().substring(0, 20);
      } else if (line.includes('(') && line.includes(')') && !line.includes('function')) {
        if (line.includes('.')) couplingCount++; // method call
        type = 'expression_statement';
        label = line.trim().substring(0, 20);
        
        // Count parameters naively
        const params = line.match(/\(([^)]+)\)/);
        if (params && params[1]) {
          parameterCount += params[1].split(',').length;
        }
      }

      if (type) {
        const nodeId = `node_${index + 1}`;
        nodes.push({
          id: nodeId,
          type: 'astNode',
          data: { label: type, text: label + '...', startPosition: { row: index, column: 0 }, endPosition: { row: index, column: line.length } }
        });
        edges.push({
          id: `edge_0_${nodeId}`,
          source: 'node_0',
          target: nodeId
        });
      }
    });

    if (blockCount === 0) {
      throw new BadRequestException('Code must contain meaningful structures (e.g., functions, classes, control flows), not just simple declarations.');
    }

    return {
      metrics: {
        cyclomaticComplexity,
        couplingCount,
        parameterCount,
        totalLines: lines.length,
      },
      ast: {
        nodes,
        edges,
      },
    };
  }
}
