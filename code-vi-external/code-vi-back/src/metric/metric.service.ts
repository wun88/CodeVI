import { Injectable, Logger } from '@nestjs/common';
import {
    AstNode,
    ClassicMetrics,
    CKMetrics,
    OOMetrics,
    CodeSmellResult,
    ProjectContext,
    FileMetricResult,
    ProjectMetricResult,
    HalsteadMetrics,
    SizeMetrics,
    CodeSmellType,
} from './types/types';

// 고전적 지표
import {
    calculateCyclomaticComplexity,
    calculateComplexityStatistics,
} from './logic/common/complexity';
import {
    calculateHalsteadMetrics,
    aggregateHalsteadMetrics,
} from './logic/common/halstead';
import {
    calculateSizeMetrics,
    aggregateSizeMetrics,
} from './logic/common/size-metric';

// 객체지향 지표
import {
    calculateCKMetrics,
    extractClasses,
    extractMethods,
    buildProjectContext,
} from './logic/class/ck-metric';
import { calculateOOMetrics } from './logic/class/oo-metric';

// 코드 스멜
import {
    detectAllCodeSmells,
    detectClassCodeSmells,
} from './logic/common/code-smell';

@Injectable()
export class MetricService {
    private readonly logger = new Logger(MetricService.name);

    // ============================================================================
    // 고전적/절차적 지표
    // ============================================================================

    /**
     * 순환 복잡도를 계산합니다.
     */
    calculateCyclomaticComplexity(ast: AstNode): number {
        return calculateCyclomaticComplexity(ast);
    }

    /**
     * Halstead 메트릭을 계산합니다.
     */
    calculateHalsteadMetrics(ast: AstNode): HalsteadMetrics {
        return calculateHalsteadMetrics(ast);
    }

    /**
     * 사이즈 메트릭을 계산합니다.
     */
    calculateSizeMetrics(ast: AstNode, sourceCode?: string): SizeMetrics {
        return calculateSizeMetrics(ast, sourceCode);
    }

    /**
     * 고전적 지표 통합 계산
     */
    calculateClassicMetrics(ast: AstNode, sourceCode?: string): ClassicMetrics {
        return {
            cyclomaticComplexity: calculateCyclomaticComplexity(ast),
            halstead: calculateHalsteadMetrics(ast),
            size: calculateSizeMetrics(ast, sourceCode),
        };
    }

    // ============================================================================
    // 객체지향 지표 (CK Metrics)
    // ============================================================================

    /**
     * 클래스의 CK 메트릭을 계산합니다.
     */
    calculateCKMetrics(
        classNode: AstNode,
        context?: ProjectContext,
        imports: string[] = [],
    ): CKMetrics {
        return calculateCKMetrics(classNode, context, imports);
    }

    /**
     * AST에서 모든 클래스를 추출하고 CK 메트릭을 계산합니다.
     */
    calculateAllCKMetrics(ast: AstNode, context?: ProjectContext): CKMetrics[] {
        const classes = extractClasses(ast);
        return classes.map((classNode) =>
            calculateCKMetrics(classNode, context, []),
        );
    }

    /**
     * 클래스의 객체지향 지표(Neal et al. 1997)를 계산합니다.
     */
    calculateOOMetrics(
        classNode: AstNode,
        context?: ProjectContext,
    ): OOMetrics {
        return calculateOOMetrics(classNode, context);
    }

    /**
     * AST에서 모든 클래스를 추출하고 객체지향 지표를 계산합니다.
     */
    calculateAllOOMetrics(ast: AstNode, context?: ProjectContext): OOMetrics[] {
        const classes = extractClasses(ast);
        return classes.map((classNode) =>
            calculateOOMetrics(classNode, context),
        );
    }

    // ============================================================================
    // 코드 스멜 감지
    // ============================================================================

    /**
     * 코드 스멜을 감지합니다.
     */
    detectCodeSmells(ast: AstNode, filePath?: string): CodeSmellResult[] {
        return detectAllCodeSmells(ast, filePath);
    }

    // ============================================================================
    // 통합 분석
    // ============================================================================

    /**
     * 단일 파일의 모든 메트릭을 분석합니다.
     */
    analyzeFile(
        ast: AstNode,
        filePath: string,
        sourceCode?: string,
        projectContext?: ProjectContext,
    ): FileMetricResult {
        const classic = this.calculateClassicMetrics(ast, sourceCode);
        const classes = this.calculateAllCKMetrics(ast, projectContext);
        const ooMetrics = this.calculateAllOOMetrics(ast, projectContext);
        const codeSmells = this.detectCodeSmells(ast, filePath);

        return {
            filePath,
            classic,
            classes,
            ooMetrics,
            codeSmells,
        };
    }

    /**
     * 여러 파일의 AST를 분석하고 프로젝트 전체 메트릭을 반환합니다.
     */
    analyzeProject(
        filesData: Array<{
            ast: AstNode;
            filePath: string;
            sourceCode?: string;
        }>,
    ): ProjectMetricResult {
        // 모든 클래스 추출하여 프로젝트 컨텍스트 구축
        const allClasses: AstNode[] = [];
        for (const fileData of filesData) {
            allClasses.push(...extractClasses(fileData.ast));
        }
        const projectContext = buildProjectContext(allClasses);

        // 각 파일 분석
        const fileResults: FileMetricResult[] = filesData.map((fileData) =>
            this.analyzeFile(
                fileData.ast,
                fileData.filePath,
                fileData.sourceCode,
                projectContext,
            ),
        );

        // 프로젝트 요약 계산
        const summary = this.calculateProjectSummary(fileResults);

        return {
            analyzedAt: new Date(),
            totalFiles: fileResults.length,
            summary,
            files: fileResults,
        };
    }

    /**
     * 프로젝트 요약을 계산합니다.
     */
    private calculateProjectSummary(fileResults: FileMetricResult[]): {
        avgCyclomaticComplexity: number;
        totalLoc: number;
        totalNcloc: number;
        totalClasses: number;
        totalMethods: number;
        codeSmellCount: number;
        smellsByType: Record<CodeSmellType, number>;
    } {
        let totalComplexity = 0;
        let totalLoc = 0;
        let totalNcloc = 0;
        let totalClasses = 0;
        let totalMethods = 0;
        let codeSmellCount = 0;
        const smellsByType: Record<string, number> = {};

        for (const file of fileResults) {
            totalComplexity += file.classic.cyclomaticComplexity;
            totalLoc += file.classic.size.loc;
            totalNcloc += file.classic.size.ncloc;
            totalClasses += file.classes.length;

            // 각 클래스의 메서드 수는 RFC에서 유추 (근사값)
            for (const ck of file.classes) {
                // WMC는 메서드 복잡도 합, 메서드 수 근사치로 사용
                totalMethods += Math.ceil(ck.wmc / 2) || 1;
            }

            for (const smell of file.codeSmells) {
                codeSmellCount++;
                smellsByType[smell.type] = (smellsByType[smell.type] || 0) + 1;
            }
        }

        const avgCyclomaticComplexity =
            fileResults.length > 0 ? totalComplexity / fileResults.length : 0;

        return {
            avgCyclomaticComplexity: Math.round(avgCyclomaticComplexity * 100) / 100,
            totalLoc,
            totalNcloc,
            totalClasses,
            totalMethods,
            codeSmellCount,
            smellsByType: smellsByType as Record<CodeSmellType, number>,
        };
    }

    /**
     * 저장된 AST 데이터에서 메트릭을 계산합니다.
     * (AstData 엔티티의 astContent를 직접 분석)
     */
    analyzeFromAstContent(astContent: any, filePath: string): FileMetricResult {
        // astContent가 AstNode 형태라고 가정
        const ast = this.normalizeAstNode(astContent);
        return this.analyzeFile(ast, filePath);
    }

    /**
     * AST 콘텐츠를 AstNode 형태로 정규화합니다.
     */
    private normalizeAstNode(content: any): AstNode {
        // content가 이미 AstNode 형태인 경우 그대로 반환
        if (content && typeof content === 'object') {
            return {
                type: content.type || 'program',
                name: content.name,
                text: content.text,
                range: content.range || {
                    start: { line: 1, col: 0 },
                    end: { line: 1, col: 0 },
                },
                children: content.children?.map((c: any) => this.normalizeAstNode(c)),
            };
        }

        // 기본 노드 반환
        return {
            type: 'unknown',
            range: { start: { line: 1, col: 0 }, end: { line: 1, col: 0 } },
        };
    }

    // ============================================================================
    // 개별 분석 메서드 (고급 사용)
    // ============================================================================

    /**
     * 메서드별 복잡도 통계를 계산합니다.
     */
    getMethodComplexityStatistics(ast: AstNode) {
        const classes = extractClasses(ast);
        const allMethods: AstNode[] = [];

        for (const cls of classes) {
            allMethods.push(...extractMethods(cls));
        }

        return calculateComplexityStatistics(allMethods);
    }

    /**
     * 여러 AST의 Halstead 메트릭을 집계합니다.
     */
    aggregateHalsteadMetrics(metricsList: HalsteadMetrics[]): HalsteadMetrics {
        return aggregateHalsteadMetrics(metricsList);
    }

    /**
     * 여러 AST의 사이즈 메트릭을 집계합니다.
     */
    aggregateSizeMetrics(metricsList: SizeMetrics[]): SizeMetrics {
        return aggregateSizeMetrics(metricsList);
    }
}
