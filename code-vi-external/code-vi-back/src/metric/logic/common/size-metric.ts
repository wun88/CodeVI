/**
 * Size Metrics (사이즈 메트릭) 계산
 *
 * - LOC: Lines of Code (전체 라인 수)
 * - SLOC: Source Lines of Code (공백 제외)
 * - CLOC: Comment Lines of Code (주석 라인)
 * - NCLOC: Non-Commented Lines of Code (주석/공백 제외)
 */

import { AstNode, SizeMetrics } from '../../types/types';

/**
 * 주석 노드 타입들
 */
const COMMENT_NODE_TYPES = new Set([
    'comment',
    'line_comment',
    'block_comment',
    'doc_comment',
    'multiline_comment',
    'documentation_comment',
    // HTML/JSX
    'html_comment',
    // Python
    'docstring',
]);

/**
 * AST 노드에서 사이즈 메트릭을 계산합니다.
 *
 * @param ast - 분석할 AST 노드
 * @param sourceCode - 원본 소스 코드 (선택적, 더 정확한 계산을 위해)
 * @returns 사이즈 메트릭
 */
export function calculateSizeMetrics(
    ast: AstNode,
    sourceCode?: string,
): SizeMetrics {
    // 소스 코드가 제공된 경우 직접 분석
    if (sourceCode) {
        return calculateFromSourceCode(sourceCode, ast);
    }

    // AST에서 범위 정보를 사용하여 계산
    return calculateFromAst(ast);
}

/**
 * 소스 코드에서 직접 사이즈 메트릭을 계산합니다.
 */
function calculateFromSourceCode(
    sourceCode: string,
    ast: AstNode,
): SizeMetrics {
    const lines = sourceCode.split('\n');
    const loc = lines.length;

    // 주석 라인 추적
    const commentLines = new Set<number>();
    collectCommentLines(ast, commentLines);

    let emptyLines = 0;
    let codeLines = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1; // 1-indexed

        if (line === '') {
            emptyLines++;
        } else if (commentLines.has(lineNumber)) {
            // 이미 주석으로 처리됨
        } else if (isCommentOnlyLine(line)) {
            commentLines.add(lineNumber);
        } else {
            codeLines++;
        }
    }

    const cloc = commentLines.size;
    const sloc = loc - emptyLines;
    const ncloc = loc - emptyLines - cloc;

    return {
        loc,
        sloc,
        cloc,
        ncloc: Math.max(0, ncloc),
    };
}

/**
 * AST의 범위 정보를 사용하여 사이즈 메트릭을 계산합니다.
 */
function calculateFromAst(ast: AstNode): SizeMetrics {
    const allLines = new Set<number>();
    const commentLines = new Set<number>();

    function traverse(node: AstNode): void {
        if (node.range) {
            const startLine = node.range.start.line;
            const endLine = node.range.end.line;

            // 모든 라인 수집
            for (let line = startLine; line <= endLine; line++) {
                allLines.add(line);
            }

            // 주석 라인 수집
            if (COMMENT_NODE_TYPES.has(node.type)) {
                for (let line = startLine; line <= endLine; line++) {
                    commentLines.add(line);
                }
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

    // AST 범위에서 전체 라인 수 계산
    let maxLine = 0;
    let minLine = Number.MAX_SAFE_INTEGER;

    for (const line of allLines) {
        maxLine = Math.max(maxLine, line);
        minLine = Math.min(minLine, line);
    }

    const loc = maxLine > 0 ? maxLine : 0;
    const cloc = commentLines.size;

    // 코드 라인만 있는 라인 수 (근사값)
    const codeOnlyLines = new Set<number>();
    for (const line of allLines) {
        if (!commentLines.has(line)) {
            codeOnlyLines.add(line);
        }
    }

    return {
        loc,
        sloc: allLines.size,      // 비어있지 않은 라인 (근사)
        cloc,
        ncloc: codeOnlyLines.size,
    };
}

/**
 * AST에서 주석 라인 번호를 수집합니다.
 */
function collectCommentLines(node: AstNode, lines: Set<number>): void {
    if (COMMENT_NODE_TYPES.has(node.type) && node.range) {
        for (let line = node.range.start.line; line <= node.range.end.line; line++) {
            lines.add(line);
        }
    }

    if (node.children) {
        for (const child of node.children) {
            collectCommentLines(child, lines);
        }
    }
}

/**
 * 한 줄이 주석만으로 이루어져 있는지 확인합니다.
 */
function isCommentOnlyLine(line: string): boolean {
    // 한 줄 주석
    if (line.startsWith('//') || line.startsWith('#')) {
        return true;
    }

    // 블록 주석 시작/끝/중간
    if (
        line.startsWith('/*') ||
        line.startsWith('*') ||
        line.endsWith('*/') ||
        (line.startsWith('*') && !line.startsWith('*/'))
    ) {
        return true;
    }

    // JSDoc/TSDoc
    if (line.startsWith('/**') || line.startsWith(' *')) {
        return true;
    }

    return false;
}

/**
 * 메서드/함수의 라인 수를 계산합니다.
 *
 * @param node - 메서드/함수 AST 노드
 * @returns 라인 수
 */
export function calculateMethodLines(node: AstNode): number {
    if (!node.range) {
        return 0;
    }

    return node.range.end.line - node.range.start.line + 1;
}

/**
 * 클래스의 라인 수를 계산합니다.
 *
 * @param node - 클래스 AST 노드
 * @returns 라인 수
 */
export function calculateClassLines(node: AstNode): number {
    return calculateMethodLines(node);
}

/**
 * 여러 파일의 사이즈 메트릭을 집계합니다.
 */
export function aggregateSizeMetrics(metricsList: SizeMetrics[]): SizeMetrics {
    return metricsList.reduce(
        (acc, m) => ({
            loc: acc.loc + m.loc,
            sloc: acc.sloc + m.sloc,
            cloc: acc.cloc + m.cloc,
            ncloc: acc.ncloc + m.ncloc,
        }),
        { loc: 0, sloc: 0, cloc: 0, ncloc: 0 },
    );
}

/**
 * 주석 비율을 계산합니다.
 *
 * @param metrics - 사이즈 메트릭
 * @returns 주석 비율 (0-1)
 */
export function calculateCommentRatio(metrics: SizeMetrics): number {
    if (metrics.sloc === 0) {
        return 0;
    }
    return metrics.cloc / metrics.sloc;
}

/**
 * 코드 밀도를 계산합니다 (NCLOC / LOC).
 *
 * @param metrics - 사이즈 메트릭
 * @returns 코드 밀도 (0-1)
 */
export function calculateCodeDensity(metrics: SizeMetrics): number {
    if (metrics.loc === 0) {
        return 0;
    }
    return metrics.ncloc / metrics.loc;
}
