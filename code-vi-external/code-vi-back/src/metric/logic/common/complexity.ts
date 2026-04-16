/**
 * Cyclomatic Complexity (순환 복잡도) 계산
 *
 * McCabe의 순환 복잡도: 제어 흐름 그래프 기반의 분기 수 계산
 * 복잡도 = 분기 포인트 수 + 1
 */

import { AstNode } from '../../types/types';

/**
 * 복잡도를 증가시키는 노드 타입들
 */
const COMPLEXITY_NODES = new Set([
    // 조건문
    'if_statement',
    'else_clause',
    'elif_clause',        // Python 

    // 반복문
    'for_statement',
    'for_in_statement',
    'while_statement',
    'do_statement',

    // Switch/Case
    'switch_statement',
    'switch_case',
    'case_clause',
    'default_clause',

    // 예외 처리
    'try_statement',
    'catch_clause',

    // 삼항 연산자
    'conditional_expression',
    'ternary_expression',

    // 널 병합 연산자
    'nullish_coalescing_expression',
]);

/**
 * 논리 연산자 (각각 분기점으로 계산)
 */
const LOGICAL_OPERATORS = new Set([
    '&&',
    '||',
    'and',  // Python
    'or',   // Python
]);

/**
 * 논리 연산자 노드 타입
 */
const BINARY_EXPRESSION_TYPES = new Set([
    'binary_expression',
    'logical_expression',
    'boolean_operator',     // Python
]);

/**
 * AST 노드에서 순환 복잡도를 계산합니다.
 *
 * @param ast - 분석할 AST 노드
 * @returns 순환 복잡도 값
 */
export function calculateCyclomaticComplexity(ast: AstNode): number {
    let complexity = 1; // 기본 복잡도

    function traverse(node: AstNode): void {
        // 분기 노드 확인
        if (COMPLEXITY_NODES.has(node.type)) {
            complexity++;
        }

        // 논리 연산자 확인 (&&, ||)
        if (BINARY_EXPRESSION_TYPES.has(node.type)) {
            const operator = findOperator(node);
            if (operator && LOGICAL_OPERATORS.has(operator)) {
                complexity++;
            }
        }

        // 자식 노드 순회
        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ast);
    return complexity;
}

/**
 * 이진 표현식에서 연산자를 찾습니다.
 */
function findOperator(node: AstNode): string | undefined {
    if (node.children) {
        for (const child of node.children) {
            if (
                child.type === 'binary_operator' ||
                child.type === 'operator' ||
                child.type === '&&' ||
                child.type === '||'
            ) {
                return child.text || child.type;
            }
        }
    }
    return node.text;
}

/**
 * 메서드/함수 노드에서 순환 복잡도를 계산합니다.
 *
 * @param methodNode - 메서드 AST 노드
 * @returns 순환 복잡도 값
 */
export function calculateMethodComplexity(methodNode: AstNode): number {
    return calculateCyclomaticComplexity(methodNode);
}

/**
 * 복잡도 수준을 평가합니다.
 *
 * @param complexity - 순환 복잡도 값
 * @returns 복잡도 수준 문자열
 */
export function evaluateComplexityLevel(
    complexity: number,
): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    if (complexity <= 5) return 'LOW';
    if (complexity <= 10) return 'MODERATE';
    if (complexity <= 20) return 'HIGH';
    return 'VERY_HIGH';
}

/**
 * 여러 메서드의 복잡도를 분석하고 통계를 반환합니다.
 */
export interface ComplexityStatistics {
    total: number;
    average: number;
    max: number;
    min: number;
    methods: Array<{
        name: string;
        complexity: number;
        level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
    }>;
}

/**
 * 여러 메서드의 복잡도 통계를 계산합니다.
 *
 * @param methods - 메서드 노드 배열
 * @returns 복잡도 통계
 */
export function calculateComplexityStatistics(
    methods: AstNode[],
): ComplexityStatistics {
    if (methods.length === 0) {
        return {
            total: 0,
            average: 0,
            max: 0,
            min: 0,
            methods: [],
        };
    }

    const methodComplexities = methods.map((method) => {
        const complexity = calculateMethodComplexity(method);
        return {
            name: method.name || 'anonymous',
            complexity,
            level: evaluateComplexityLevel(complexity),
        };
    });

    const complexities = methodComplexities.map((m) => m.complexity);
    const total = complexities.reduce((sum, c) => sum + c, 0);

    return {
        total,
        average: total / methods.length,
        max: Math.max(...complexities),
        min: Math.min(...complexities),
        methods: methodComplexities,
    };
}
