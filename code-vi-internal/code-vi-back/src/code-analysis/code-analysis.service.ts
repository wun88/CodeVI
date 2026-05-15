import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CodeAnalysis } from './entities/code-analysis.entity';
import { CreateCodeAnalysisDto } from './dto/create-code-analysis.dto';
import { PartialAnalysisDto } from './dto/partial-analysis.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CodeAnalysisService {
  private readonly logger = new Logger(CodeAnalysisService.name);
  constructor(
    @InjectRepository(CodeAnalysis)
    private readonly codeAnalysisRepository: Repository<CodeAnalysis>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
  analyzePartialCode(dto: PartialAnalysisDto) {
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
      return this.fallbackAnalyze(code, language, lines);
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

    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeIdCounter = 0;

    const buildGraph = (node: any, parentId: string | null = null) => {
      const currentId = `node_${nodeIdCounter++}`;

      nodes.push({
        id: currentId,
        type: 'astNode',
        data: {
          label: node.type,
          text:
            node.text.length > 20
              ? node.text.substring(0, 20) + '...'
              : node.text,
          startPosition: node.startPosition,
          endPosition: node.endPosition,
        },
      });

      if (parentId) {
        edges.push({
          id: `edge_${parentId}_${currentId}`,
          source: parentId,
          target: currentId,
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        buildGraph(node.child(i), currentId);
      }
    };

    buildGraph(tree.rootNode);

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
