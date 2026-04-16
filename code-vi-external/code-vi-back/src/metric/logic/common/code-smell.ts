/**
 * Code Smell (코드 스멜) 감지
 *
 * 다양한 코드 스멜 패턴을 감지합니다:
 * - Duplicated Code, Long Method, Large Class
 * - Long Parameter List, Feature Envy, Data Clumps
 * - Switch Statements, 기타 스멜들
 */

import {
    AstNode,
    CodeSmellResult,
    CodeSmellType,
    CodeSmellSeverity,
    DuplicatedCodeResult,
    LargeClassResult,
    LargeClassThresholds,
    FeatureEnvyResult,
    DataClumpResult,
    SwitchStatementResult,
} from '../../types/types';
import {
    DEFAULT_THRESHOLDS,
} from '../../types/threshold';
import {
    extractMethods,
    extractFields,
    extractClassName,
} from '../class/ck-metric';

// ============================================================================
// Duplicated Code (중복 코드)
// ============================================================================

/**
 * 토큰 시퀀스를 추출합니다.
 */
function extractTokens(node: AstNode): string[] {
    const tokens: string[] = [];

    function traverse(n: AstNode): void {
        // 리프 노드이거나 텍스트가 있는 경우 토큰으로 추가
        if (n.text && !n.children?.length) {
            tokens.push(n.text);
        } else if (n.type) {
            tokens.push(n.type);
        }

        if (n.children) {
            for (const child of n.children) {
                traverse(child);
            }
        }
    }

    traverse(node);
    return tokens;
}

/**
 * 두 토큰 시퀀스의 유사도를 계산합니다 (Jaccard 유사도).
 */
function calculateTokenSimilarity(
    tokens1: string[],
    tokens2: string[],
): number {
    if (tokens1.length === 0 || tokens2.length === 0) {
        return 0;
    }

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    let intersection = 0;
    for (const token of set1) {
        if (set2.has(token)) {
            intersection++;
        }
    }

    const union = set1.size + set2.size - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * 중복 코드를 감지합니다.
 *
 * @param methods - 분석할 메서드 노드 배열
 * @param threshold - 유사도 임계값 (기본: 0.8)
 * @param minTokens - 최소 토큰 수 (기본: 50)
 * @returns 중복 코드 결과 배열
 */
export function detectDuplicatedCode(
    methods: AstNode[],
    threshold: number = DEFAULT_THRESHOLDS.DUPLICATED_CODE_SIMILARITY,
    minTokens: number = DEFAULT_THRESHOLDS.DUPLICATED_CODE_MIN_TOKENS,
): DuplicatedCodeResult[] {
    const results: DuplicatedCodeResult[] = [];

    // 각 메서드의 토큰 시퀀스 추출
    const methodTokens: Array<{
        node: AstNode;
        name: string;
        tokens: string[];
    }> = [];

    for (const method of methods) {
        const tokens = extractTokens(method);
        if (tokens.length >= minTokens) {
            methodTokens.push({
                node: method,
                name: method.name || 'anonymous',
                tokens,
            });
        }
    }

    // 모든 쌍에 대해 유사도 검사
    for (let i = 0; i < methodTokens.length; i++) {
        for (let j = i + 1; j < methodTokens.length; j++) {
            const similarity = calculateTokenSimilarity(
                methodTokens[i].tokens,
                methodTokens[j].tokens,
            );

            if (similarity >= threshold) {
                results.push({
                    similarity: Math.round(similarity * 100) / 100,
                    source1: {
                        name: methodTokens[i].name,
                        startLine: methodTokens[i].node.range?.start.line || 0,
                        endLine: methodTokens[i].node.range?.end.line || 0,
                    },
                    source2: {
                        name: methodTokens[j].name,
                        startLine: methodTokens[j].node.range?.start.line || 0,
                        endLine: methodTokens[j].node.range?.end.line || 0,
                    },
                    tokenCount: Math.min(
                        methodTokens[i].tokens.length,
                        methodTokens[j].tokens.length,
                    ),
                });
            }
        }
    }

    return results;
}

// ============================================================================
// Long Method (긴 메서드)
// ============================================================================

/**
 * Long Method 스멜을 감지합니다.
 *
 * @param methodNode - 메서드 AST 노드
 * @param threshold - 라인 수 임계값 (기본: 20)
 * @returns 스멜 여부
 */
export function detectLongMethod(
    methodNode: AstNode,
    threshold: number = DEFAULT_THRESHOLDS.LONG_METHOD_LINES,
): boolean {
    if (!methodNode.range) {
        return false;
    }

    const lines =
        methodNode.range.end.line - methodNode.range.start.line + 1;
    return lines > threshold;
}

/**
 * Long Method에 대한 상세 결과를 반환합니다.
 */
export function analyzeLongMethod(
    methodNode: AstNode,
    threshold: number = DEFAULT_THRESHOLDS.LONG_METHOD_LINES,
): { isSmell: boolean; lineCount: number; threshold: number } {
    const lineCount = methodNode.range
        ? methodNode.range.end.line - methodNode.range.start.line + 1
        : 0;

    return {
        isSmell: lineCount > threshold,
        lineCount,
        threshold,
    };
}

// ============================================================================
// Large Class (거대한 클래스)
// ============================================================================

/**
 * Large Class 스멜을 감지합니다.
 *
 * @param classNode - 클래스 AST 노드
 * @param thresholds - 임계값 설정
 * @returns Large Class 분석 결과
 */
export function detectLargeClass(
    classNode: AstNode,
    thresholds: Partial<LargeClassThresholds> = {},
): LargeClassResult {
    const maxFields =
        thresholds.maxFields ?? DEFAULT_THRESHOLDS.LARGE_CLASS_FIELDS;
    const maxMethods =
        thresholds.maxMethods ?? DEFAULT_THRESHOLDS.LARGE_CLASS_METHODS;
    const maxLoc = thresholds.maxLoc ?? DEFAULT_THRESHOLDS.LARGE_CLASS_LOC;

    const fields = extractFields(classNode);
    const methods = extractMethods(classNode);
    const loc = classNode.range
        ? classNode.range.end.line - classNode.range.start.line + 1
        : 0;

    const violations: string[] = [];

    if (fields.length > maxFields) {
        violations.push(`fields (${fields.length} > ${maxFields})`);
    }
    if (methods.length > maxMethods) {
        violations.push(`methods (${methods.length} > ${maxMethods})`);
    }
    if (loc > maxLoc) {
        violations.push(`LOC (${loc} > ${maxLoc})`);
    }

    return {
        isSmell: violations.length > 0,
        fieldCount: fields.length,
        methodCount: methods.length,
        loc,
        violations,
    };
}

// ============================================================================
// Long Parameter List
// ============================================================================

/**
 * 메서드의 파라미터 수를 계산합니다.
 */
function countParameters(methodNode: AstNode): number {
    let count = 0;

    function findParams(node: AstNode): void {
        if (
            node.type === 'formal_parameters' ||
            node.type === 'parameters' ||
            node.type === 'parameter_list'
        ) {
            // 파라미터 자식 노드 카운트
            if (node.children) {
                for (const child of node.children) {
                    if (
                        child.type === 'required_parameter' ||
                        child.type === 'optional_parameter' ||
                        child.type === 'parameter' ||
                        child.type === 'identifier' ||
                        child.type === 'rest_parameter'
                    ) {
                        count++;
                    }
                }
            }
            return;
        }

        if (node.children) {
            for (const child of node.children) {
                findParams(child);
            }
        }
    }

    findParams(methodNode);
    return count;
}

/**
 * 파라미터 이름 목록을 추출합니다.
 */
function extractParameterNames(methodNode: AstNode): string[] {
    const names: string[] = [];

    function findParams(node: AstNode): void {
        if (
            node.type === 'formal_parameters' ||
            node.type === 'parameters' ||
            node.type === 'parameter_list'
        ) {
            if (node.children) {
                for (const child of node.children) {
                    const name = extractParamName(child);
                    if (name) {
                        names.push(name);
                    }
                }
            }
            return;
        }

        if (node.children) {
            for (const child of node.children) {
                findParams(child);
            }
        }
    }

    findParams(methodNode);
    return names;
}

/**
 * 파라미터 노드에서 이름을 추출합니다.
 */
function extractParamName(paramNode: AstNode): string | undefined {
    if (paramNode.name) {
        return paramNode.name;
    }

    if (paramNode.children) {
        for (const child of paramNode.children) {
            if (child.type === 'identifier') {
                return child.text || child.name;
            }
        }
    }

    return paramNode.text;
}

/**
 * Long Parameter List 스멜을 감지합니다.
 *
 * @param methodNode - 메서드 AST 노드
 * @param threshold - 파라미터 수 임계값 (기본: 4)
 * @returns 스멜 여부
 */
export function detectLongParameterList(
    methodNode: AstNode,
    threshold: number = DEFAULT_THRESHOLDS.LONG_PARAMETER_COUNT,
): boolean {
    return countParameters(methodNode) > threshold;
}

/**
 * Long Parameter List에 대한 상세 결과를 반환합니다.
 */
export function analyzeLongParameterList(
    methodNode: AstNode,
    threshold: number = DEFAULT_THRESHOLDS.LONG_PARAMETER_COUNT,
): { isSmell: boolean; parameterCount: number; parameters: string[] } {
    const parameters = extractParameterNames(methodNode);

    return {
        isSmell: parameters.length > threshold,
        parameterCount: parameters.length,
        parameters,
    };
}

// ============================================================================
// Feature Envy
// ============================================================================

/**
 * 메서드 내에서 참조되는 객체/클래스별 참조 횟수를 계산합니다.
 */
function countClassReferences(
    methodNode: AstNode,
    ownClassName: string,
): Map<string, number> {
    const references = new Map<string, number>();

    function traverse(node: AstNode): void {
        // this.xxx 접근 (자신의 클래스)
        if (node.type === 'member_expression') {
            const obj = node.children?.find(
                (c) => c.type === 'this' || c.text === 'this',
            );
            if (obj) {
                references.set(
                    ownClassName,
                    (references.get(ownClassName) || 0) + 1,
                );
            } else {
                // other.xxx 접근 (다른 객체)
                const objNode = node.children?.[0];
                if (objNode?.type === 'identifier') {
                    const objName = objNode.text || objNode.name || 'unknown';
                    references.set(objName, (references.get(objName) || 0) + 1);
                }
            }
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(methodNode);
    return references;
}

/**
 * Feature Envy 스멜을 감지합니다.
 * 자신의 클래스보다 다른 클래스의 데이터를 더 많이 사용하는 메서드
 *
 * @param methodNode - 메서드 AST 노드
 * @param className - 해당 클래스 이름
 * @returns Feature Envy 분석 결과
 */
export function detectFeatureEnvy(
    methodNode: AstNode,
    className: string,
): FeatureEnvyResult {
    const references = countClassReferences(methodNode, className);
    const ownReferences = references.get(className) || 0;

    // 외부 참조 중 가장 많은 것 찾기
    let maxExternal = 0;
    let mostEnviedClass: string | undefined;

    for (const [refClass, count] of references) {
        if (refClass !== className && count > maxExternal) {
            maxExternal = count;
            mostEnviedClass = refClass;
        }
    }

    // 외부 참조가 자신의 참조보다 많으면 Feature Envy
    const externalReferences = new Map<string, number>();
    for (const [refClass, count] of references) {
        if (refClass !== className) {
            externalReferences.set(refClass, count);
        }
    }

    return {
        isSmell: maxExternal > ownReferences && maxExternal > 0,
        methodName: methodNode.name || 'anonymous',
        ownClassReferences: ownReferences,
        externalReferences,
        mostEnviedClass,
    };
}

// ============================================================================
// Data Clumps
// ============================================================================

/**
 * Data Clumps 스멜을 감지합니다.
 * 3개 이상의 파라미터가 반복적으로 나타나는 패턴
 *
 * @param methods - 메서드 노드 배열
 * @param minParams - 최소 파라미터 수 (기본: 3)
 * @param minOccurrences - 최소 발생 횟수 (기본: 2)
 * @returns Data Clump 결과 배열
 */
export function detectDataClumps(
    methods: AstNode[],
    minParams: number = DEFAULT_THRESHOLDS.DATA_CLUMPS_MIN_PARAMS,
    minOccurrences: number = DEFAULT_THRESHOLDS.DATA_CLUMPS_MIN_OCCURRENCES,
): DataClumpResult[] {
    // 각 메서드의 파라미터 수집
    const methodParams: Array<{
        name: string;
        params: string[];
        startLine: number;
    }> = [];

    for (const method of methods) {
        const params = extractParameterNames(method);
        if (params.length >= minParams) {
            methodParams.push({
                name: method.name || 'anonymous',
                params,
                startLine: method.range?.start.line || 0,
            });
        }
    }

    // 파라미터 조합별 발생 횟수 계산
    const clumpCounts = new Map<
        string,
        Array<{ methodName: string; startLine: number }>
    >();

    for (const mp of methodParams) {
        // minParams 길이의 모든 조합 생성
        const combinations = getCombinations(mp.params, minParams);

        for (const combo of combinations) {
            const key = combo.sort().join('|');
            if (!clumpCounts.has(key)) {
                clumpCounts.set(key, []);
            }
            clumpCounts.get(key)!.push({
                methodName: mp.name,
                startLine: mp.startLine,
            });
        }
    }

    // minOccurrences 이상인 것만 반환
    const results: DataClumpResult[] = [];

    for (const [key, occurrences] of clumpCounts) {
        if (occurrences.length >= minOccurrences) {
            results.push({
                parameters: key.split('|'),
                occurrences,
            });
        }
    }

    return results;
}

/**
 * 배열에서 n개의 요소를 선택하는 조합을 생성합니다.
 */
function getCombinations<T>(arr: T[], n: number): T[][] {
    if (n === 0) return [[]];
    if (arr.length < n) return [];

    const result: T[][] = [];

    function combine(start: number, current: T[]): void {
        if (current.length === n) {
            result.push([...current]);
            return;
        }

        for (let i = start; i < arr.length; i++) {
            current.push(arr[i]);
            combine(i + 1, current);
            current.pop();
        }
    }

    combine(0, []);
    return result;
}

// ============================================================================
// Switch Statements
// ============================================================================

/**
 * Switch Statements 스멜을 감지합니다.
 * switch문 또는 연속된 if-else 체인
 *
 * @param ast - 분석할 AST 노드
 * @param minCases - 최소 케이스 수 (기본: 3)
 * @returns Switch Statement 결과 배열
 */
export function detectSwitchStatements(
    ast: AstNode,
    minCases: number = DEFAULT_THRESHOLDS.SWITCH_MIN_CASES,
): SwitchStatementResult[] {
    const results: SwitchStatementResult[] = [];

    function traverse(node: AstNode): void {
        // switch 문 감지
        if (node.type === 'switch_statement') {
            const caseCount = countSwitchCases(node);
            if (caseCount >= minCases) {
                results.push({
                    type: 'switch',
                    caseCount,
                    startLine: node.range?.start.line || 0,
                    endLine: node.range?.end.line || 0,
                });
            }
        }

        // if-else 체인 감지
        if (node.type === 'if_statement') {
            const chainLength = countIfElseChain(node);
            if (chainLength >= minCases) {
                results.push({
                    type: 'if-else-chain',
                    caseCount: chainLength,
                    startLine: node.range?.start.line || 0,
                    endLine: findIfElseChainEnd(node),
                });
            }
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ast);
    return results;
}

/**
 * switch 문의 case 수를 계산합니다.
 */
function countSwitchCases(switchNode: AstNode): number {
    let count = 0;

    function traverse(node: AstNode): void {
        if (
            node.type === 'switch_case' ||
            node.type === 'case_clause' ||
            node.type === 'default_clause'
        ) {
            count++;
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(switchNode);
    return count;
}

/**
 * if-else 체인의 길이를 계산합니다.
 */
function countIfElseChain(ifNode: AstNode): number {
    let count = 1; // 현재 if 문

    function findElse(node: AstNode): void {
        if (node.children) {
            for (const child of node.children) {
                if (
                    child.type === 'else_clause' ||
                    child.type === 'elif_clause'
                ) {
                    count++;
                    // 중첩된 if 찾기
                    if (child.children) {
                        for (const grandchild of child.children) {
                            if (grandchild.type === 'if_statement') {
                                findElse(grandchild);
                            }
                        }
                    }
                }
            }
        }
    }

    findElse(ifNode);
    return count;
}

/**
 * if-else 체인의 마지막 라인을 찾습니다.
 */
function findIfElseChainEnd(ifNode: AstNode): number {
    let endLine = ifNode.range?.end.line || 0;

    function traverse(node: AstNode): void {
        if (node.range && node.range.end.line > endLine) {
            endLine = node.range.end.line;
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ifNode);
    return endLine;
}

// ============================================================================
// 통합 코드 스멜 감지
// ============================================================================

/**
 * 심각도를 결정합니다.
 */
function determineSeverity(
    type: CodeSmellType,
    value?: number,
): CodeSmellSeverity {
    switch (type) {
        case 'DUPLICATED_CODE':
            return 'HIGH';
        case 'LONG_METHOD':
            return value && value > 50 ? 'HIGH' : 'MEDIUM';
        case 'LARGE_CLASS':
            return 'HIGH';
        case 'LONG_PARAMETER_LIST':
            return value && value > 7 ? 'HIGH' : 'MEDIUM';
        case 'FEATURE_ENVY':
            return 'MEDIUM';
        case 'DATA_CLUMPS':
            return 'MEDIUM';
        case 'SWITCH_STATEMENTS':
            return 'LOW';
        default:
            return 'LOW';
    }
}

/**
 * 클래스의 모든 코드 스멜을 감지합니다.
 *
 * @param classNode - 클래스 AST 노드
 * @param filePath - 파일 경로 (선택)
 * @returns 코드 스멜 결과 배열
 */
export function detectClassCodeSmells(
    classNode: AstNode,
    filePath?: string,
): CodeSmellResult[] {
    const results: CodeSmellResult[] = [];
    const className = extractClassName(classNode);
    const methods = extractMethods(classNode);

    // Large Class 검사
    const largeClassResult = detectLargeClass(classNode);
    if (largeClassResult.isSmell) {
        results.push({
            type: 'LARGE_CLASS',
            severity: 'HIGH',
            message: `Large class detected: ${largeClassResult.violations.join(', ')}`,
            location: {
                filePath,
                className,
                startLine: classNode.range?.start.line || 0,
                endLine: classNode.range?.end.line || 0,
            },
            details: largeClassResult,
        });
    }

    // 각 메서드에 대한 스멜 검사
    for (const method of methods) {
        const methodName = method.name || 'anonymous';

        // Long Method
        const longMethodResult = analyzeLongMethod(method);
        if (longMethodResult.isSmell) {
            results.push({
                type: 'LONG_METHOD',
                severity: determineSeverity(
                    'LONG_METHOD',
                    longMethodResult.lineCount,
                ),
                message: `Method has ${longMethodResult.lineCount} lines (threshold: ${longMethodResult.threshold})`,
                location: {
                    filePath,
                    className,
                    methodName,
                    startLine: method.range?.start.line || 0,
                    endLine: method.range?.end.line || 0,
                },
                details: longMethodResult,
            });
        }

        // Long Parameter List
        const paramResult = analyzeLongParameterList(method);
        if (paramResult.isSmell) {
            results.push({
                type: 'LONG_PARAMETER_LIST',
                severity: determineSeverity(
                    'LONG_PARAMETER_LIST',
                    paramResult.parameterCount,
                ),
                message: `Method has ${paramResult.parameterCount} parameters`,
                location: {
                    filePath,
                    className,
                    methodName,
                    startLine: method.range?.start.line || 0,
                    endLine: method.range?.end.line || 0,
                },
                details: paramResult,
            });
        }

        // Feature Envy
        const envyResult = detectFeatureEnvy(method, className);
        if (envyResult.isSmell) {
            results.push({
                type: 'FEATURE_ENVY',
                severity: 'MEDIUM',
                message: `Method is more interested in ${envyResult.mostEnviedClass} than its own class`,
                location: {
                    filePath,
                    className,
                    methodName,
                    startLine: method.range?.start.line || 0,
                    endLine: method.range?.end.line || 0,
                },
                details: {
                    ownReferences: envyResult.ownClassReferences,
                    mostEnviedClass: envyResult.mostEnviedClass,
                },
            });
        }

        // Switch Statements
        const switchResults = detectSwitchStatements(method);
        for (const switchResult of switchResults) {
            results.push({
                type: 'SWITCH_STATEMENTS',
                severity: 'LOW',
                message: `${switchResult.type === 'switch' ? 'Switch statement' : 'If-else chain'} with ${switchResult.caseCount} cases`,
                location: {
                    filePath,
                    className,
                    methodName,
                    startLine: switchResult.startLine,
                    endLine: switchResult.endLine,
                },
                details: switchResult,
            });
        }
    }

    // Duplicated Code
    const duplicates = detectDuplicatedCode(methods);
    for (const dup of duplicates) {
        results.push({
            type: 'DUPLICATED_CODE',
            severity: 'HIGH',
            message: `Duplicated code between ${dup.source1.name} and ${dup.source2.name} (${Math.round(dup.similarity * 100)}% similarity)`,
            location: {
                filePath,
                className,
                startLine: Math.min(dup.source1.startLine, dup.source2.startLine),
                endLine: Math.max(dup.source1.endLine, dup.source2.endLine),
            },
            details: dup,
        });
    }

    // Data Clumps
    const clumps = detectDataClumps(methods);
    for (const clump of clumps) {
        results.push({
            type: 'DATA_CLUMPS',
            severity: 'MEDIUM',
            message: `Parameters [${clump.parameters.join(', ')}] appear together in ${clump.occurrences.length} methods`,
            location: {
                filePath,
                className,
                startLine: Math.min(...clump.occurrences.map((o) => o.startLine)),
                endLine: Math.max(...clump.occurrences.map((o) => o.startLine)),
            },
            details: clump,
        });
    }

    return results;
}

/**
 * 전체 AST에서 코드 스멜을 감지합니다.
 */
export function detectAllCodeSmells(
    ast: AstNode,
    filePath?: string,
): CodeSmellResult[] {
    const results: CodeSmellResult[] = [];

    // 클래스가 있는 경우 클래스별로 분석
    const classNodes = findAllNodes(ast, [
        'class_declaration',
        'class_definition',
        'class',
    ]);

    for (const classNode of classNodes) {
        results.push(...detectClassCodeSmells(classNode, filePath));
    }

    // 클래스 외부의 함수들도 분석
    const functions = findAllNodes(ast, [
        'function_declaration',
        'function_definition',
    ]);

    for (const func of functions) {
        // Long Method
        const longResult = analyzeLongMethod(func);
        if (longResult.isSmell) {
            results.push({
                type: 'LONG_METHOD',
                severity: determineSeverity('LONG_METHOD', longResult.lineCount),
                message: `Function has ${longResult.lineCount} lines`,
                location: {
                    filePath,
                    methodName: func.name || 'anonymous',
                    startLine: func.range?.start.line || 0,
                    endLine: func.range?.end.line || 0,
                },
                details: longResult,
            });
        }

        // Long Parameter List
        const paramResult = analyzeLongParameterList(func);
        if (paramResult.isSmell) {
            results.push({
                type: 'LONG_PARAMETER_LIST',
                severity: determineSeverity(
                    'LONG_PARAMETER_LIST',
                    paramResult.parameterCount,
                ),
                message: `Function has ${paramResult.parameterCount} parameters`,
                location: {
                    filePath,
                    methodName: func.name || 'anonymous',
                    startLine: func.range?.start.line || 0,
                    endLine: func.range?.end.line || 0,
                },
                details: paramResult,
            });
        }
    }

    return results;
}

/**
 * 특정 타입의 모든 노드를 찾습니다.
 */
function findAllNodes(ast: AstNode, types: string[]): AstNode[] {
    const nodes: AstNode[] = [];
    const typeSet = new Set(types);

    function traverse(node: AstNode): void {
        if (typeSet.has(node.type)) {
            nodes.push(node);
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ast);
    return nodes;
}
