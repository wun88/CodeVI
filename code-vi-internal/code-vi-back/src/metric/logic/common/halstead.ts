/**
 * Halstead Metrics (Halstead 복잡도 메트릭) 계산
 *
 * Maurice H. Halstead의 소프트웨어 과학 메트릭
 * 연산자(Operators)와 피연산자(Operands)를 기반으로 계산
 */

import { AstNode, HalsteadMetrics } from '../../types/types';

/**
 * 연산자로 분류되는 노드 타입들
 */
const OPERATOR_NODE_TYPES = new Set([
    // 대입 연산자
    'assignment_expression',
    'augmented_assignment_expression',

    // 이진 연산자
    'binary_expression',
    'logical_expression',

    // 단항 연산자
    'unary_expression',
    'update_expression',

    // 멤버 접근
    'member_expression',
    'subscript_expression',

    // 함수 호출
    'call_expression',
    'new_expression',

    // 조건 연산자
    'conditional_expression',
    'ternary_expression',

    // 타입 연산자
    'instanceof_expression',
    'typeof_expression',
]);

/**
 * 연산자 토큰들
 */
const OPERATORS = new Set([
    // 산술 연산자
    '+', '-', '*', '/', '%', '**',
    // 비교 연산자
    '==', '===', '!=', '!==', '<', '>', '<=', '>=',
    // 논리 연산자
    '&&', '||', '!', '??',
    // 비트 연산자
    '&', '|', '^', '~', '<<', '>>', '>>>',
    // 대입 연산자
    '=', '+=', '-=', '*=', '/=', '%=',
    '&=', '|=', '^=', '<<=', '>>=', '>>>=',
    '??=', '&&=', '||=',
    // 증감 연산자
    '++', '--',
    // 멤버 접근
    '.', '?.', '?.[',
    // 기타
    '?', ':', ',', ';',
    'typeof', 'instanceof', 'in', 'of',
    'new', 'delete', 'void', 'await',
    '=>', '...',
]);

/**
 * 피연산자로 분류되는 노드 타입들
 */
const OPERAND_NODE_TYPES = new Set([
    // 식별자
    'identifier',
    'property_identifier',
    'shorthand_property_identifier',
    'type_identifier',

    // 리터럴
    'number',
    'string',
    'template_string',
    'true',
    'false',
    'null',
    'undefined',
    'regex',
    'string_literal',
    'number_literal',
    'boolean_literal',
    'integer',
    'float',
]);

/**
 * AST에서 Halstead 메트릭을 계산합니다.
 *
 * @param ast - 분석할 AST 노드
 * @returns Halstead 메트릭
 */
export function calculateHalsteadMetrics(ast: AstNode): HalsteadMetrics {
    const operators: Map<string, number> = new Map(); // 연산자 -> 출현 횟수
    const operands: Map<string, number> = new Map();  // 피연산자 -> 출현 횟수

    function collectToken(
        token: string,
        collection: Map<string, number>,
    ): void {
        collection.set(token, (collection.get(token) || 0) + 1);
    }

    function traverse(node: AstNode): void {
        // 연산자 수집
        if (OPERATOR_NODE_TYPES.has(node.type)) {
            collectToken(node.type, operators);
        }

        // 연산자 토큰 확인
        if (node.text && OPERATORS.has(node.text)) {
            collectToken(node.text, operators);
        }

        // 피연산자 수집
        if (OPERAND_NODE_TYPES.has(node.type)) {
            const name = node.name || node.text || node.type;
            collectToken(name, operands);
        }

        // 자식 노드 순회
        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ast);

    // 메트릭 계산
    const n1 = operators.size;    // 고유 연산자 수
    const n2 = operands.size;     // 고유 피연산자 수
    const N1 = sumValues(operators); // 총 연산자 수
    const N2 = sumValues(operands);  // 총 피연산자 수

    const vocabulary = n1 + n2;
    const length = N1 + N2;

    // 0으로 나누기 방지
    const volume = vocabulary > 0 ? length * Math.log2(vocabulary) : 0;
    const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;
    const effort = difficulty * volume;
    const time = effort / 18;                // 초 단위
    const bugs = volume / 3000;              // 예상 버그 수

    return {
        n1,
        n2,
        N1,
        N2,
        vocabulary,
        length,
        volume: roundToDecimal(volume, 2),
        difficulty: roundToDecimal(difficulty, 2),
        effort: roundToDecimal(effort, 2),
        time: roundToDecimal(time, 2),
        bugs: roundToDecimal(bugs, 4),
    };
}

/**
 * Map의 모든 값을 합산합니다.
 */
function sumValues(map: Map<string, number>): number {
    let sum = 0;
    for (const value of map.values()) {
        sum += value;
    }
    return sum;
}

/**
 * 숫자를 지정된 소수점 자리까지 반올림합니다.
 */
function roundToDecimal(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Halstead 복잡도 레벨을 평가합니다.
 */
export function evaluateHalsteadLevel(
    metrics: HalsteadMetrics,
): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    // Volume 기반 평가
    if (metrics.volume < 100) return 'LOW';
    if (metrics.volume < 500) return 'MODERATE';
    if (metrics.volume < 1500) return 'HIGH';
    return 'VERY_HIGH';
}

/**
 * 여러 AST 노드의 Halstead 메트릭을 집계합니다.
 */
export function aggregateHalsteadMetrics(
    metricsList: HalsteadMetrics[],
): HalsteadMetrics {
    if (metricsList.length === 0) {
        return {
            n1: 0, n2: 0, N1: 0, N2: 0,
            vocabulary: 0, length: 0, volume: 0,
            difficulty: 0, effort: 0, time: 0, bugs: 0,
        };
    }

    const n1 = metricsList.reduce((sum, m) => sum + m.n1, 0);
    const n2 = metricsList.reduce((sum, m) => sum + m.n2, 0);
    const N1 = metricsList.reduce((sum, m) => sum + m.N1, 0);
    const N2 = metricsList.reduce((sum, m) => sum + m.N2, 0);

    const vocabulary = n1 + n2;
    const length = N1 + N2;
    const volume = vocabulary > 0 ? length * Math.log2(vocabulary) : 0;
    const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;
    const effort = difficulty * volume;
    const time = effort / 18;
    const bugs = volume / 3000;

    return {
        n1, n2, N1, N2,
        vocabulary,
        length,
        volume: roundToDecimal(volume, 2),
        difficulty: roundToDecimal(difficulty, 2),
        effort: roundToDecimal(effort, 2),
        time: roundToDecimal(time, 2),
        bugs: roundToDecimal(bugs, 4),
    };
}
