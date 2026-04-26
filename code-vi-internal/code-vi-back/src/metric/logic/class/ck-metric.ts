/**
 * CK Metrics (Chidamber-Kemerer 객체지향 메트릭) 계산
 *
 * - WMC: Weighted Methods per Class
 * - DIT: Depth of Inheritance Tree
 * - NOC: Number of Children
 * - CBO: Coupling Between Object Classes
 * - RFC: Response For a Class
 * - LCOM: Lack of Cohesion in Methods
 */

import { AstNode, CKMetrics, ProjectContext } from '../../types/types';
import { calculateCyclomaticComplexity } from '../common/complexity';

// ============================================================================
// 클래스/메서드/필드 추출 헬퍼
// ============================================================================

/**
 * 클래스 노드 타입들
 */
const CLASS_NODE_TYPES = new Set([
    'class_declaration',
    'class_definition',
    'class',
    'class_expression',
    'interface_declaration',
]);

/**
 * 메서드 노드 타입들
 */
const METHOD_NODE_TYPES = new Set([
    'method_definition',
    'function_definition',
    'function_declaration',
    'arrow_function',
    'method',
    'class_method',
    'constructor_definition',
    'getter',
    'setter',
]);

/**
 * 필드/프로퍼티 노드 타입들
 */
const FIELD_NODE_TYPES = new Set([
    'field_definition',
    'property_declaration',
    'public_field_definition',
    'private_field_definition',
    'class_property',
    'instance_variable',
]);

/**
 * AST 노드를 순회하며 콜백 함수를 실행합니다.
 * 콜백이 false를 반환하면 해당 노드의 자식 노드 순회를 건너뜁니다.
 */
export function traverse(node: AstNode, callback: (node: AstNode) => boolean | void): void {
    if (callback(node) === false) {
        return;
    }

    if (node.children) {
        for (const child of node.children) {
            traverse(child, callback);
        }
    }
}


/**
 * 클래스에서 메서드 노드들을 추출합니다.
 */
export function extractMethods(classNode: AstNode): AstNode[] {
    const methods: AstNode[] = [];

    function traverse(node: AstNode): void {
        if (METHOD_NODE_TYPES.has(node.type)) {
            methods.push(node);
            return; // 중첩 함수는 제외
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    if (classNode.children) {
        for (const child of classNode.children) {
            traverse(child);
        }
    }

    return methods;
}

/**
 * 클래스에서 필드 노드들을 추출합니다.
 */
export function extractFields(classNode: AstNode): AstNode[] {
    const fields: AstNode[] = [];

    function traverse(node: AstNode): void {
        if (FIELD_NODE_TYPES.has(node.type)) {
            fields.push(node);
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    if (classNode.children) {
        for (const child of classNode.children) {
            traverse(child);
        }
    }

    return fields;
}

/**
 * 클래스 이름을 추출합니다.
 */
export function extractClassName(classNode: AstNode): string {
    if (classNode.name) {
        return classNode.name;
    }

    // 자식에서 이름 찾기
    if (classNode.children) {
        for (const child of classNode.children) {
            if (child.type === 'identifier' || child.type === 'type_identifier') {
                return child.text || child.name || 'Anonymous';
            }
        }
    }

    return 'Anonymous';
}

/**
 * 클래스의 부모 클래스 이름을 추출합니다.
 */
export function extractParentClassName(classNode: AstNode): string | undefined {
    function findExtends(node: AstNode): string | undefined {
        if (
            node.type === 'class_heritage' ||
            node.type === 'extends_clause' ||
            node.type === 'superclass'
        ) {
            // extends 절에서 부모 클래스 이름 찾기
            if (node.children) {
                for (const child of node.children) {
                    if (
                        child.type === 'identifier' ||
                        child.type === 'type_identifier'
                    ) {
                        return child.text || child.name;
                    }
                }
            }
        }

        if (node.children) {
            for (const child of node.children) {
                const result = findExtends(child);
                if (result) return result;
            }
        }

        return undefined;
    }

    return findExtends(classNode);
}

// ============================================================================
// WMC (Weighted Methods per Class)
// ============================================================================

/**
 * WMC (Weighted Methods per Class)를 계산합니다.
 * 클래스 내 모든 메서드의 순환 복잡도 합계
 *
 * @param classNode - 클래스 AST 노드
 * @returns WMC 값
 */
export function calculateWMC(classNode: AstNode): number {
    const methods = extractMethods(classNode);

    if (methods.length === 0) {
        return 0;
    }

    return methods.reduce((sum, method) => {
        return sum + calculateCyclomaticComplexity(method);
    }, 0);
}

// ============================================================================
// DIT (Depth of Inheritance Tree)
// ============================================================================

/**
 * DIT (Depth of Inheritance Tree)를 계산합니다.
 * 상속 계층의 깊이
 *
 * @param className - 클래스 이름
 * @param inheritanceMap - 상속 관계 맵 (className -> parentClassName)
 * @returns DIT 값
 */
export function calculateDIT(
    className: string,
    inheritanceMap: Map<string, string>,
): number {
    let depth = 0;
    let currentClass = className;

    // 상위 클래스를 추적하면서 깊이 계산
    while (inheritanceMap.has(currentClass)) {
        const parent = inheritanceMap.get(currentClass);
        if (!parent || parent === currentClass) {
            break; // 무한 루프 방지
        }
        depth++;
        currentClass = parent;
    }

    return depth;
}

/**
 * 클래스 노드에서 DIT를 계산합니다.
 */
export function calculateDITFromNode(
    classNode: AstNode,
    inheritanceMap: Map<string, string>,
): number {
    const className = extractClassName(classNode);
    return calculateDIT(className, inheritanceMap);
}

// ============================================================================
// NOC (Number of Children)
// ============================================================================

/**
 * NOC (Number of Children)를 계산합니다.
 * 해당 클래스를 상속받는 직계 자식 클래스 수
 *
 * @param className - 클래스 이름
 * @param inheritanceMap - 상속 관계 맵 (className -> parentClassName)
 * @returns NOC 값
 */
export function calculateNOC(
    className: string,
    inheritanceMap: Map<string, string>,
): number {
    let count = 0;

    // 모든 클래스를 순회하며 부모가 className인 것을 카운트
    for (const [, parent] of inheritanceMap) {
        if (parent === className) {
            count++;
        }
    }

    return count;
}

/**
 * 자식 클래스 맵을 구축합니다.
 */
export function buildChildrenMap(
    inheritanceMap: Map<string, string>,
): Map<string, string[]> {
    const childrenMap = new Map<string, string[]>();

    for (const [child, parent] of inheritanceMap) {
        if (!childrenMap.has(parent)) {
            childrenMap.set(parent, []);
        }
        childrenMap.get(parent)!.push(child);
    }

    return childrenMap;
}

// ============================================================================
// CBO (Coupling Between Object Classes)
// ============================================================================

/**
 * CBO (Coupling Between Object Classes)를 계산합니다.
 * 해당 클래스가 의존하는 다른 클래스의 수
 *
 * @param classNode - 클래스 AST 노드
 * @param imports - import된 클래스/모듈 목록
 * @param ownClassName - 자신의 클래스 이름
 * @returns CBO 값
 */
export function calculateCBO(
    classNode: AstNode,
    imports: string[] = [],
    ownClassName?: string,
): number {
    const dependencies = new Set<string>();
    const className = ownClassName || extractClassName(classNode);

    const parentName = extractParentClassName(classNode);
    if (parentName && parentName !== className) {
        dependencies.add(parentName);
    }

    // Import된 클래스 추가
    for (const imp of imports) {
        if (imp !== className) {
            dependencies.add(imp);
        }
    }

    // 클래스 내부에서 참조되는 타입들 수집
    function collectTypeDependencies(node: AstNode): void {
        // 타입 참조
        if (
            node.type === 'type_identifier' ||
            node.type === 'type_annotation' ||
            node.type === 'type_reference'
        ) {
            const typeName = node.text || node.name;
            if (typeName && typeName !== className && isClassName(typeName)) {
                dependencies.add(typeName);
            }
        }

        // new 표현식
        if (node.type === 'new_expression') {
            const constructorName = findConstructorName(node);
            if (constructorName && constructorName !== className) {
                dependencies.add(constructorName);
            }
        }

        // 메서드 호출의 객체
        if (
            node.type === 'member_expression' ||
            node.type === 'call_expression'
        ) {
            // 복잡한 분석은 생략, 기본적인 의존성만 수집
        }

        if (node.children) {
            for (const child of node.children) {
                collectTypeDependencies(child);
            }
        }
    }

    collectTypeDependencies(classNode);

    return dependencies.size;
}

/**
 * new 표현식에서 생성자 이름을 찾습니다.
 */
function findConstructorName(newExpr: AstNode): string | undefined {
    if (newExpr.children) {
        for (const child of newExpr.children) {
            if (child.type === 'identifier') {
                return child.text || child.name;
            }
        }
    }
    return undefined;
}

/**
 * 클래스 이름인지 확인합니다 (대문자로 시작).
 */
function isClassName(name: string): boolean {
    return /^[A-Z]/.test(name);
}

// ============================================================================
// RFC (Response For a Class)
// ============================================================================

/**
 * RFC (Response For a Class)를 계산합니다.
 * 클래스 내 메서드 수 + 해당 메서드들이 호출하는 외부 메서드 수
 *
 * @param classNode - 클래스 AST 노드
 * @returns RFC 값
 */
export function calculateRFC(classNode: AstNode): number {
    const methods = extractMethods(classNode);
    const methodNames = new Set<string>();
    const calledMethods = new Set<string>();

    // 클래스 내 메서드 이름 수집
    for (const method of methods) {
        const name = method.name || findMethodName(method);
        if (name) {
            methodNames.add(name);
        }
    }

    // 각 메서드에서 호출하는 메서드 수집
    for (const method of methods) {
        collectCalledMethods(method, calledMethods);
    }

    // RFC = |RS|, where RS is the response set uniting the class's methods and called methods
    // Unnamed methods are still a part of the class, so we use their base count.
    let rfc = methods.length;
    for (const called of calledMethods) {
        if (!methodNames.has(called)) {
            rfc++;
        }
    }

    return rfc;
}

/**
 * 메서드 이름을 찾습니다.
 */
function findMethodName(methodNode: AstNode): string | undefined {
    if (methodNode.children) {
        for (const child of methodNode.children) {
            if (
                child.type === 'property_identifier' ||
                child.type === 'identifier'
            ) {
                return child.text || child.name;
            }
        }
    }
    return undefined;
}

/**
 * 메서드 내에서 호출되는 메서드들을 수집합니다.
 */
function collectCalledMethods(node: AstNode, methods: Set<string>): void {
    if (node.type === 'call_expression') {
        const calledName = findCalledMethodName(node);
        if (calledName) {
            methods.add(calledName);
        }
    }

    if (node.children) {
        for (const child of node.children) {
            collectCalledMethods(child, methods);
        }
    }
}

/**
 * call_expression에서 호출되는 메서드 이름을 찾습니다.
 */
function findCalledMethodName(callExpr: AstNode): string | undefined {
    if (callExpr.children) {
        for (const child of callExpr.children) {
            // 직접 함수 호출: foo()
            if (child.type === 'identifier') {
                return child.text || child.name;
            }
            // 멤버 함수 호출: obj.foo()
            if (child.type === 'member_expression') {
                return findPropertyName(child);
            }
        }
    }
    return undefined;
}

/**
 * member_expression에서 프로퍼티 이름을 찾습니다.
 */
function findPropertyName(memberExpr: AstNode): string | undefined {
    if (memberExpr.children) {
        for (const child of memberExpr.children) {
            if (child.type === 'property_identifier') {
                return child.text || child.name;
            }
        }
    }
    return undefined;
}

// ============================================================================
// LCOM (Lack of Cohesion in Methods)
// ============================================================================

/**
 * LCOM (Lack of Cohesion in Methods)를 계산합니다.
 * 메서드 간 인스턴스 변수 공유를 기반으로 응집도 계산
 *
 * LCOM = P - Q (P >= Q인 경우), 0 (그 외)
 * P = 인스턴스 변수를 공유하지 않는 메서드 쌍의 수
 * Q = 인스턴스 변수를 공유하는 메서드 쌍의 수
 *
 * @param classNode - 클래스 AST 노드
 * @returns LCOM 값 (낮을수록 응집도가 높음)
 */
export function calculateLCOM(classNode: AstNode): number {
    const methods = extractMethods(classNode);
    const fields = extractFields(classNode);

    if (methods.length < 2 || fields.length === 0) {
        return 0; // 비교할 메서드 쌍이 없거나 필드가 없음
    }

    // 각 필드의 이름 추출
    const fieldNames = new Set<string>();
    for (const field of fields) {
        const name = field.name || findFieldName(field);
        if (name) {
            fieldNames.add(name);
        }
    }

    // 각 메서드가 접근하는 필드 집합
    const methodFieldAccess: Map<string, Set<string>> = new Map();

    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        const methodName = method.name || findMethodName(method) || `method_${i}`;
        const accessedFields = new Set<string>();

        collectAccessedFields(method, fieldNames, accessedFields);
        methodFieldAccess.set(methodName, accessedFields);
    }

    // 메서드 쌍 비교
    let P = 0; // 공유하지 않는 쌍
    let Q = 0; // 공유하는 쌍

    const methodList = Array.from(methodFieldAccess.entries());

    // Paper: "If all n sets {I1}...{In} are empty then let P = empty"
    let allEmpty = true;
    for (const [, accessedFields] of methodList) {
        if (accessedFields.size > 0) {
            allEmpty = false;
            break;
        }
    }
    
    if (allEmpty) {
        return 0; // LCOM is 0
    }

    for (let i = 0; i < methodList.length; i++) {
        for (let j = i + 1; j < methodList.length; j++) {
            const fields1 = methodList[i][1];
            const fields2 = methodList[j][1];

            // 공유하는 필드가 있는지 확인
            let shared = false;
            for (const field of fields1) {
                if (fields2.has(field)) {
                    shared = true;
                    break;
                }
            }

            if (shared) {
                Q++;
            } else {
                P++;
            }
        }
    }

    return Math.max(0, P - Q);
}

/**
 * 필드 이름을 찾습니다.
 */
function findFieldName(fieldNode: AstNode): string | undefined {
    if (fieldNode.name) {
        return fieldNode.name;
    }

    if (fieldNode.children) {
        for (const child of fieldNode.children) {
            if (
                child.type === 'property_identifier' ||
                child.type === 'identifier'
            ) {
                return child.text || child.name;
            }
        }
    }

    return undefined;
}

/**
 * 메서드 내에서 접근하는 필드를 수집합니다.
 */
function collectAccessedFields(
    node: AstNode,
    fieldNames: Set<string>,
    accessed: Set<string>,
): void {
    // this.field 접근
    if (node.type === 'member_expression') {
        const obj = node.children?.find(
            (c) => c.type === 'this' || c.text === 'this',
        );
        if (obj) {
            const prop = node.children?.find(
                (c) => c.type === 'property_identifier' || c.type === 'identifier',
            );
            const propName = prop?.text || prop?.name;
            if (propName && fieldNames.has(propName)) {
                accessed.add(propName);
            }
        }
    }

    // 직접 필드 접근 (클래스 필드인 경우)
    if (node.type === 'identifier') {
        const name = node.text || node.name;
        if (name && fieldNames.has(name)) {
            accessed.add(name);
        }
    }

    if (node.children) {
        for (const child of node.children) {
            collectAccessedFields(child, fieldNames, accessed);
        }
    }
}

// ============================================================================
// 통합 CK Metrics 계산
// ============================================================================

/**
 * 클래스의 모든 CK 메트릭을 계산합니다.
 *
 * @param classNode - 클래스 AST 노드
 * @param context - 프로젝트 컨텍스트 (상속 정보 등)
 * @param imports - import된 클래스 목록
 * @returns CK 메트릭
 */
export function calculateCKMetrics(
    classNode: AstNode,
    context?: ProjectContext,
    imports: string[] = [],
): CKMetrics {
    const className = extractClassName(classNode);
    const inheritanceMap = context?.inheritanceMap || new Map();

    return {
        className,
        wmc: calculateWMC(classNode),
        dit: calculateDIT(className, inheritanceMap),
        noc: calculateNOC(className, inheritanceMap),
        cbo: calculateCBO(classNode, imports, className),
        rfc: calculateRFC(classNode),
        lcom: calculateLCOM(classNode),
    };
}

/**
 * AST에서 모든 클래스 노드를 추출합니다.
 */
export function extractClasses(ast: AstNode): AstNode[] {
    const classes: AstNode[] = [];

    function traverse(node: AstNode): void {
        if (CLASS_NODE_TYPES.has(node.type)) {
            classes.push(node);
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(ast);
    return classes;
}

/**
 * 프로젝트 전체의 상속 관계 맵을 구축합니다.
 */
export function buildInheritanceMap(
    classNodes: AstNode[],
): Map<string, string> {
    const inheritanceMap = new Map<string, string>();

    for (const classNode of classNodes) {
        const className = extractClassName(classNode);
        const parentName = extractParentClassName(classNode);

        if (parentName) {
            inheritanceMap.set(className, parentName);
        }
    }

    return inheritanceMap;
}

/**
 * 프로젝트 컨텍스트를 구축합니다.
 */
export function buildProjectContext(classNodes: AstNode[]): ProjectContext {
    const inheritanceMap = buildInheritanceMap(classNodes);
    const childrenMap = buildChildrenMap(inheritanceMap);
    const allClasses = new Set<string>();

    for (const classNode of classNodes) {
        allClasses.add(extractClassName(classNode));
    }

    // OO-metrics에 필요한 맵도 컨텍스트에 포함 (추가)
    const classMethodsMap = new Map<string, number>();
    const classMethodNamesMap = new Map<string, Set<string>>();

    for (const classNode of classNodes) {
        const className = extractClassName(classNode);
        const methods = extractMethods(classNode);
        
        classMethodsMap.set(className, methods.length);
        
        const methodNames = new Set<string>();
        for (const method of methods) {
            const name = method.name || findMethodName(method);
            if (name) methodNames.add(name);
        }
        classMethodNamesMap.set(className, methodNames);
    }

    return {
        inheritanceMap,
        childrenMap,
        allClasses,
        classMethodsMap,
        classMethodNamesMap,
    };
}
