/**
 * AST 기반 코드 품질 지표 측정을 위한 공통 타입 정의
 */

// ============================================================================
// AST 노드 타입
// ============================================================================

export interface AstNodeRange {
    start: { line: number; col: number };
    end: { line: number; col: number };
}

export interface AstNode {
    type: string;
    name?: string;
    text?: string;
    range: AstNodeRange;
    children?: AstNode[];
}

// ============================================================================
// 고전적/절차적 지표 타입
// ============================================================================

/**
 * Halstead 복잡도 메트릭
 */
export interface HalsteadMetrics {
    n1: number;           // 고유 연산자 수 (distinct operators)
    n2: number;           // 고유 피연산자 수 (distinct operands)
    N1: number;           // 총 연산자 수 (total operators)
    N2: number;           // 총 피연산자 수 (total operands)
    vocabulary: number;   // 어휘 수 (n1 + n2)
    length: number;       // 프로그램 길이 (N1 + N2)
    volume: number;       // 볼륨 (N × log₂(n))
    difficulty: number;   // 난이도 ((n1 / 2) × (N2 / n2))
    effort: number;       // 노력 (D × V)
    time: number;         // 예상 시간 (E / 18초)
    bugs: number;         // 예상 버그 수 (V / 3000)
}

/**
 * 사이즈 메트릭
 */
export interface SizeMetrics {
    loc: number;          // Lines of Code (전체 라인 수)
    sloc: number;         // Source Lines of Code (공백 제외)
    cloc: number;         // Comment Lines of Code (주석 라인)
    ncloc: number;        // Non-Commented Lines of Code (주석/공백 제외)
}

/**
 * 고전적 지표 통합 결과
 */
export interface ClassicMetrics {
    cyclomaticComplexity: number;
    halstead: HalsteadMetrics;
    size: SizeMetrics;
}

// ============================================================================
// 객체지향 지표 타입 (CK Metrics)
// ============================================================================

/**
 * 클래스 단위 CK 메트릭
 */
export interface CKMetrics {
    className: string;
    wmc: number;          // Weighted Methods per Class
    dit: number;          // Depth of Inheritance Tree
    noc: number;          // Number of Children
    cbo: number;          // Coupling Between Object Classes
    rfc: number;          // Response For a Class
    lcom: number;         // Lack of Cohesion in Methods
}

/**
 * OO Metrics (Neal et al. 1997)
 */
export interface OOMetrics {
    className: string;
    pmi: number;          // Potential Methods Inherited
    pmis: number;         // Proportion of Methods Inherited by a Subclass
    dmc: number;          // Density of Methodological Cohesiveness
    maa: number;          // Messages and Arguments
    dac: number;          // Density of Abstract Classes
    pom: number;          // Proportion of Overriding Methods in a Subclass
    ucgu: number;         // Unnecessary Coupling through Global Usage
    dcbo: number;         // Degree of Coupling between Classes
    prim: number;         // Number of Private Instance Methods
    sml: number;          // Strings of Message Links
}

/**
 * 프로젝트 전체의 상속 관계 정보
 */
export interface InheritanceInfo {
    className: string;
    parentClassName?: string;
    filePath?: string;
}

/**
 * 프로젝트 컨텍스트 (전체 프로젝트 분석 시 필요)
 */
export interface ProjectContext {
    inheritanceMap: Map<string, string>;  // className -> parentClassName
    childrenMap: Map<string, string[]>;   // className -> childClassNames[]
    allClasses: Set<string>;
    classMethodsMap?: Map<string, number>;
    classMethodNamesMap?: Map<string, Set<string>>;
}

// ============================================================================
// 코드 스멜 타입
// ============================================================================

// 22가지 코드 스멜 유형
export type CodeSmellType =
    | 'DUPLICATED_CODE'
    | 'LONG_METHOD'
    | 'LARGE_CLASS'
    | 'LONG_PARAMETER_LIST'
    | 'FEATURE_ENVY'
    | 'DATA_CLUMPS'
    | 'SWITCH_STATEMENTS'
    | 'DIVERGENT_CHANGE'
    | 'SHOTGUN_SURGERY'
    | 'PRIMITIVE_OBSESSION'
    | 'PARALLEL_INHERITANCE'
    | 'LAZY_CLASS'
    | 'SPECULATIVE_GENERALITY'
    | 'TEMPORARY_FIELD'
    | 'MESSAGE_CHAINS'
    | 'MIDDLE_MAN'
    | 'INAPPROPRIATE_INTIMACY'
    | 'ALTERNATIVE_CLASSES'
    | 'INCOMPLETE_LIBRARY_CLASS'
    | 'DATA_CLASS'
    | 'REFUSED_BEQUEST'
    | 'EXCESSIVE_COMMENTS';

// 코드 스멜 심각도
export type CodeSmellSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * 코드 스멜 감지 결과
 */
export interface CodeSmellResult {
    type: CodeSmellType;
    severity: CodeSmellSeverity;
    message: string;
    location: {
        filePath?: string;
        className?: string;
        methodName?: string;
        startLine: number;
        endLine: number;
    };
    details?: any;
}

/**
 * 중복 코드 감지 결과
 */
export interface DuplicatedCodeResult {
    similarity: number;        // 유사도 (0-1)
    source1: {
        name: string;
        startLine: number;
        endLine: number;
    };
    source2: {
        name: string;
        startLine: number;
        endLine: number;
    };
    tokenCount: number;        // 중복 토큰 수
}

/**
 * Large Class 감지 임계값
 */
export interface LargeClassThresholds {
    maxFields: number;         // 기본: 15
    maxMethods: number;        // 기본: 20
    maxLoc: number;            // 기본: 300
}

/**
 * Large Class 감지 결과
 */
export interface LargeClassResult {
    isSmell: boolean;
    fieldCount: number;
    methodCount: number;
    loc: number;
    violations: string[];      // 어떤 임계값을 초과했는지
}

/**
 * Feature Envy 감지 결과
 */
export interface FeatureEnvyResult {
    isSmell: boolean;
    methodName: string;
    ownClassReferences: number;
    externalReferences: Map<string, number>;  // className -> referenceCount
    mostEnviedClass?: string;
}

/**
 * Data Clumps 감지 결과
 */
export interface DataClumpResult {
    parameters: string[];      // 반복되는 파라미터 조합
    occurrences: {
        methodName: string;
        startLine: number;
    }[];
}

/**
 * Switch Statement 감지 결과
 */
export interface SwitchStatementResult {
    type: 'switch' | 'if-else-chain';
    caseCount: number;
    startLine: number;
    endLine: number;
}

// ============================================================================
// 통합 메트릭 결과
// ============================================================================

/**
 * 파일 단위 메트릭 결과
 */
export interface FileMetricResult {
    filePath: string;
    classic: ClassicMetrics;
    classes: CKMetrics[];
    ooMetrics: OOMetrics[];
    codeSmells: CodeSmellResult[];
}

/**
 * 프로젝트 전체 메트릭 결과
 */
export interface ProjectMetricResult {
    analyzedAt: Date;
    totalFiles: number;
    summary: {
        avgCyclomaticComplexity: number;
        totalLoc: number;
        totalNcloc: number;
        totalClasses: number;
        totalMethods: number;
        codeSmellCount: number;
        smellsByType: Record<CodeSmellType, number>;
    };
    files: FileMetricResult[];
}