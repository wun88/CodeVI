/**
 * 메트릭 결과 DTO
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// Halstead Metrics DTO
// ============================================================================

export class HalsteadMetricsDto {
    @ApiProperty({ description: '고유 연산자 수' })
    n1: number;

    @ApiProperty({ description: '고유 피연산자 수' })
    n2: number;

    @ApiProperty({ description: '총 연산자 수' })
    N1: number;

    @ApiProperty({ description: '총 피연산자 수' })
    N2: number;

    @ApiProperty({ description: '어휘 수 (n1 + n2)' })
    vocabulary: number;

    @ApiProperty({ description: '프로그램 길이 (N1 + N2)' })
    length: number;

    @ApiProperty({ description: '볼륨' })
    volume: number;

    @ApiProperty({ description: '난이도' })
    difficulty: number;

    @ApiProperty({ description: '노력' })
    effort: number;

    @ApiProperty({ description: '예상 시간 (초)' })
    time: number;

    @ApiProperty({ description: '예상 버그 수' })
    bugs: number;
}

// ============================================================================
// Size Metrics DTO
// ============================================================================

export class SizeMetricsDto {
    @ApiProperty({ description: '전체 라인 수 (LOC)' })
    loc: number;

    @ApiProperty({ description: '소스 라인 수 (SLOC, 공백 제외)' })
    sloc: number;

    @ApiProperty({ description: '주석 라인 수 (CLOC)' })
    cloc: number;

    @ApiProperty({ description: '비주석 코드 라인 수 (NCLOC)' })
    ncloc: number;
}

// ============================================================================
// Classic Metrics DTO
// ============================================================================

export class ClassicMetricsDto {
    @ApiProperty({ description: '순환 복잡도' })
    cyclomaticComplexity: number;

    @ApiProperty({ description: 'Halstead 메트릭', type: HalsteadMetricsDto })
    halstead: HalsteadMetricsDto;

    @ApiProperty({ description: '사이즈 메트릭', type: SizeMetricsDto })
    size: SizeMetricsDto;
}

// ============================================================================
// CK Metrics DTO
// ============================================================================

export class CKMetricsDto {
    @ApiProperty({ description: '클래스 이름' })
    className: string;

    @ApiProperty({ description: 'Weighted Methods per Class' })
    wmc: number;

    @ApiProperty({ description: 'Depth of Inheritance Tree' })
    dit: number;

    @ApiProperty({ description: 'Number of Children' })
    noc: number;

    @ApiProperty({ description: 'Coupling Between Object Classes' })
    cbo: number;

    @ApiProperty({ description: 'Response For a Class' })
    rfc: number;

    @ApiProperty({ description: 'Lack of Cohesion in Methods' })
    lcom: number;
}

// ============================================================================
// OO Metrics DTO
// ============================================================================

export class OOMetricsDto {
    @ApiProperty({ description: '클래스 이름' })
    className: string;

    @ApiProperty({ description: 'Potential Methods Inherited' })
    pmi: number;

    @ApiProperty({ description: 'Proportion of Methods Inherited by a Subclass' })
    pmis: number;

    @ApiProperty({ description: 'Density of Methodological Cohesiveness' })
    dmc: number;

    @ApiProperty({ description: 'Messages and Arguments' })
    maa: number;

    @ApiProperty({ description: 'Density of Abstract Classes' })
    dac: number;

    @ApiProperty({ description: 'Proportion of Overriding Methods in a Subclass' })
    pom: number;

    @ApiProperty({ description: 'Unnecessary Coupling through Global Usage' })
    ucgu: number;

    @ApiProperty({ description: 'Degree of Coupling between Classes' })
    dcbo: number;

    @ApiProperty({ description: 'Number of Private Instance Methods' })
    prim: number;

    @ApiProperty({ description: 'Strings of Message Links' })
    sml: number;
}

// ============================================================================
// Code Smell DTO
// ============================================================================

export class CodeSmellLocationDto {
    @ApiPropertyOptional({ description: '파일 경로' })
    filePath?: string;

    @ApiPropertyOptional({ description: '클래스 이름' })
    className?: string;

    @ApiPropertyOptional({ description: '메서드 이름' })
    methodName?: string;

    @ApiProperty({ description: '시작 라인' })
    startLine: number;

    @ApiProperty({ description: '종료 라인' })
    endLine: number;
}

export class CodeSmellDto {
    @ApiProperty({
        description: '코드 스멜 타입',
        enum: [
            'DUPLICATED_CODE',
            'LONG_METHOD',
            'LARGE_CLASS',
            'LONG_PARAMETER_LIST',
            'FEATURE_ENVY',
            'DATA_CLUMPS',
            'SWITCH_STATEMENTS',
        ],
    })
    type: string;

    @ApiProperty({
        description: '심각도',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    })
    severity: string;

    @ApiProperty({ description: '메시지' })
    message: string;

    @ApiProperty({ description: '위치 정보', type: CodeSmellLocationDto })
    location: CodeSmellLocationDto;

    @ApiPropertyOptional({ description: '상세 정보' })
    details?: Record<string, unknown>;
}

// ============================================================================
// File Metric Result DTO
// ============================================================================

export class FileMetricResultDto {
    @ApiProperty({ description: '파일 경로' })
    filePath: string;

    @ApiProperty({ description: '고전적 지표', type: ClassicMetricsDto })
    classic: ClassicMetricsDto;

    @ApiProperty({
        description: '클래스별 CK 지표',
        type: [CKMetricsDto],
    })
    classes: CKMetricsDto[];

    @ApiProperty({
        description: '클래스별 객체지향 지표 (Neal et al. 1997)',
        type: [OOMetricsDto],
    })
    ooMetrics: OOMetricsDto[];

    @ApiProperty({
        description: '코드 스멜 목록',
        type: [CodeSmellDto],
    })
    codeSmells: CodeSmellDto[];
}

// ============================================================================
// Project Summary DTO
// ============================================================================

export class ProjectSummaryDto {
    @ApiProperty({ description: '평균 순환 복잡도' })
    avgCyclomaticComplexity: number;

    @ApiProperty({ description: '전체 LOC' })
    totalLoc: number;

    @ApiProperty({ description: '전체 NCLOC' })
    totalNcloc: number;

    @ApiProperty({ description: '전체 클래스 수' })
    totalClasses: number;

    @ApiProperty({ description: '전체 메서드 수' })
    totalMethods: number;

    @ApiProperty({ description: '코드 스멜 개수' })
    codeSmellCount: number;

    @ApiProperty({ description: '타입별 코드 스멜 수' })
    smellsByType: Record<string, number>;
}

// ============================================================================
// Project Metric Result DTO
// ============================================================================

export class ProjectMetricResultDto {
    @ApiProperty({ description: '분석 시간' })
    analyzedAt: Date;

    @ApiProperty({ description: '분석된 파일 수' })
    totalFiles: number;

    @ApiProperty({ description: '프로젝트 요약', type: ProjectSummaryDto })
    summary: ProjectSummaryDto;

    @ApiProperty({
        description: '파일별 메트릭 결과',
        type: [FileMetricResultDto],
    })
    files: FileMetricResultDto[];
}

// ============================================================================
// Analysis Request DTO
// ============================================================================

export class AnalyzeAstRequestDto {
    @ApiProperty({ description: 'AST 데이터 배열' })
    astData: any[];

    @ApiPropertyOptional({ description: '파일 경로 (선택)' })
    filePath?: string;

    @ApiPropertyOptional({ description: '소스 코드 (선택)' })
    sourceCode?: string;
}

export class AnalyzeProjectRequestDto {
    @ApiProperty({ description: '팀 프로젝트 ID' })
    teamProjectId: number;
}
