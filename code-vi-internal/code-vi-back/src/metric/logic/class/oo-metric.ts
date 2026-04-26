import { AstNode, OOMetrics, ProjectContext } from '../../types/types';
import { extractClassName, extractMethods, extractFields } from './ck-metric';

// ============================================================================
// OO Metrics (Neal et al. 1997)
// ============================================================================

/**
 * 1. PMI (Potential Methods Inherited)
 * 클래스가 호출할 수 있는 잠재적인 메서드의 최대 수 (상속된 메서드 + 자신의 메서드)
 */
export function calculatePMI(
    classNode: AstNode,
    inheritanceMap: Map<string, string>,
    classMethodsMap: Map<string, number>, // className -> local method count
): number {
    const className = extractClassName(classNode);
    const localMethodsCount = extractMethods(classNode).length;

    let inheritedMethodsCount = 0;
    let currentClass = className;

    // 조상 클래스들을 순회하며 메서드 수 합산
    while (inheritanceMap.has(currentClass)) {
        const parent = inheritanceMap.get(currentClass);
        if (!parent || parent === currentClass) {
            break;
        }
        inheritedMethodsCount += classMethodsMap.get(parent) || 0;
        currentClass = parent;
    }

    return localMethodsCount + inheritedMethodsCount;
}

/**
 * 2. PMIS (Proportion of Methods Inherited by a Subclass)
 * 상속된 메서드 수 / 이용 가능한 전체 메서드 수 (NMI / PMI)
 */
export function calculatePMIS(
    classNode: AstNode,
    inheritanceMap: Map<string, string>,
    classMethodsMap: Map<string, number>,
): number {
    const pmi = calculatePMI(classNode, inheritanceMap, classMethodsMap);
    if (pmi === 0) return 0;
    
    // NMI: 상속받은 메서드 수 계산
    const localMethodsCount = extractMethods(classNode).length;
    const nmi = pmi - localMethodsCount;
    
    return nmi / pmi;
}

/**
 * 3. DMC (Density of Methodological Cohesiveness)
 * 인스턴스 변수를 공유하는 메서드 쌍의 비율
 */
export function calculateDMC(classNode: AstNode): number {
    const methods = extractMethods(classNode);
    const fields = extractFields(classNode);

    if (methods.length < 2 || fields.length === 0) {
        return 0;
    }

    const fieldNames = new Set<string>();
    for (const field of fields) {
        const name = field.name || findFieldName(field);
        if (name) fieldNames.add(name);
    }

    const methodFieldAccess: Map<string, Set<string>> = new Map();
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        const methodName = method.name || findMethodName(method) || `method_${i}`;
        const accessedFields = new Set<string>();
        collectAccessedFields(method, fieldNames, accessedFields);
        methodFieldAccess.set(methodName, accessedFields);
    }

    let S = 0; // 공유하는 쌍
    const methodList = Array.from(methodFieldAccess.entries());
    const N = methodList.length;
    const totalPairs = (N * (N - 1)) / 2;

    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            const fields1 = methodList[i][1];
            const fields2 = methodList[j][1];

            for (const field of fields1) {
                if (fields2.has(field)) {
                    S++;
                    break;
                }
            }
        }
    }

    return totalPairs > 0 ? (S / totalPairs) : 0;
}

/**
 * 4. MAA (Messages and Arguments)
 * 메서드의 통신 복잡도 계량화: 각 메서드의 메시지 전송(호출) 수 + 각 메시지의 인자 수 합계
 */
export function calculateMAA(classNode: AstNode): number {
    const methods = extractMethods(classNode);
    let totalMAA = 0;

    for (const method of methods) {
        totalMAA += calculateMethodMAA(method);
    }

    return totalMAA;
}

function calculateMethodMAA(node: AstNode): number {
    let maa = 0;

    function traverse(currentNode: AstNode) {
        if (currentNode.type === 'call_expression') {
            maa += 1; // 메시지 전송(호출) 수
            
            // 인자 수 계산
            for (const child of currentNode.children || []) {
                if (child.type === 'arguments') {
                    // child.children은 인자들 (식별자, 리터럴 등)과 기호들(괄호, 콤마) 포함
                    for (const argNode of child.children || []) {
                        if (argNode.type !== '(' && argNode.type !== ')' && argNode.type !== ',') {
                            maa += 1;
                        }
                    }
                }
            }
        }

        if (currentNode.children) {
            for (const child of currentNode.children) {
                traverse(child);
            }
        }
    }

    traverse(node);
    return maa;
}

/**
 * 5. DAC (Density of Abstract Classes)
 * 프로젝트 내 전체 클래스 중 추상 클래스의 비율 (이 메서드는 프로젝트 레벨에서 호출되어야 함)
 * 파일/클래스 레벨 계산 시 호출하지 않고, 전체 계산 시 사용되거나 클래스 속성으로 유지
 */
export function isAbstractClass(classNode: AstNode): boolean {
    if (classNode.type === 'interface_declaration') return true;
    
    // abstract class 판단
    if (classNode.text && classNode.text.includes('abstract class')) {
        return true;
    }
    
    // 추상 메서드 포함 여부 확인
    let hasAbstractMethod = false;
    const methods = extractMethods(classNode);
    for (const method of methods) {
        if (method.text && method.text.includes('abstract ')) {
            hasAbstractMethod = true;
            break;
        }
    }
    
    return hasAbstractMethod;
}

/**
 * 6. POM (Proportion of Overriding Methods in a Subclass)
 * 자식 클래스의 전체 메서드 중 부모 클래스의 메서드를 오버라이딩한 메서드의 비율
 */
export function calculatePOM(
    classNode: AstNode,
    inheritanceMap: Map<string, string>,
    classMethodNamesMap: Map<string, Set<string>>,
): number {
    const className = extractClassName(classNode);
    const methods = extractMethods(classNode);
    if (methods.length === 0) return 0;

    const parentName = inheritanceMap.get(className);
    if (!parentName) return 0; // 부모가 없으면 오버라이드된 메서드도 0

    const overriddenCount = countOverridingMethods(className, methods, inheritanceMap, classMethodNamesMap);
    
    return overriddenCount / methods.length;
}

function countOverridingMethods(
    currentClass: string,
    methods: AstNode[],
    inheritanceMap: Map<string, string>,
    classMethodNamesMap: Map<string, Set<string>>
): number {
    let overridden = 0;
    
    for (const method of methods) {
        const methodName = method.name || findMethodName(method);
        if (!methodName) continue;
        
        let parentClass = inheritanceMap.get(currentClass);
        let foundInParent = false;
        
        // 조상 클래스들을 순회하며 오버라이드 여부 확인
        while (parentClass && !foundInParent) {
            const parentMethods = classMethodNamesMap.get(parentClass);
            if (parentMethods && parentMethods.has(methodName)) {
                foundInParent = true;
                break;
            }
            parentClass = inheritanceMap.get(parentClass);
        }
        
        if (foundInParent) {
            overridden++;
        }
    }
    
    return overridden;
}

/**
 * 7. UCGU (Unnecessary Coupling through Global Usage)
 * 전역 변수/시스템 변수 등이 호출된 횟수 (이 모듈에서는 간단히 클래스 범위 밖의 변수 참조 및 window/global 등을 전역으로 간주)
 */
export function calculateUCGU(classNode: AstNode): number {
    let ucguCount = 0;
    // 간단한 근사치: window, global, process 등의 접근 횟수 카운트
    const globalContexts = new Set(['window', 'global', 'process', 'document', 'console']);

    function traverse(currentNode: AstNode) {
        if (currentNode.type === 'identifier') {
            const name = currentNode.text || currentNode.name;
            if (name && globalContexts.has(name)) {
                ucguCount++;
            }
        }
        if (currentNode.children) {
            for (const child of currentNode.children) {
                traverse(child);
            }
        }
    }

    traverse(classNode);
    return ucguCount;
}

/**
 * 8. DCBO (Degree of Coupling between Classes)
 * 클래스가 다른 클래스의 메서드를 호출하는 횟수 (외부 클래스 메서드 활용)
 */
export function calculateDCBO(classNode: AstNode, ownClassName: string): number {
    let dcboCount = 0;

    function traverse(currentNode: AstNode) {
        if (currentNode.type === 'call_expression') {
            const calledMethodPath = extractCallObjectPath(currentNode);
            if (calledMethodPath && calledMethodPath !== 'this' && calledMethodPath !== 'super') {
                dcboCount++;
            }
        }

        if (currentNode.children) {
            for (const child of currentNode.children) {
                traverse(child);
            }
        }
    }

    traverse(classNode);
    return dcboCount;
}

function extractCallObjectPath(callNode: AstNode): string | undefined {
    if (!callNode.children) return undefined;
    for (const child of callNode.children) {
        if (child.type === 'member_expression') {
            // obj.method() -> obj
            const objChild = child.children?.find(c => c.type === 'identifier' || c.type === 'this' || c.type === 'super');
            if (objChild) {
                return objChild.text || objChild.name || objChild.type; // 'this', 'super', 'console', 'Math' 등
            }
        }
    }
    return undefined;
}

/**
 * 9. PrIM (Number of Private Instance Methods)
 * private 접근 제어자를 가지는 생성 횟수 (private 메서드 수)
 */
export function calculatePrIM(classNode: AstNode): number {
    const methods = extractMethods(classNode);
    let privateCount = 0;

    for (const method of methods) {
        const text = method.text || '';
        // 접근 제어자로 'private'가 명시되어 있거나, JS의 경우 '#'으로 시작하는 등
        if (text.includes('private ') || (method.name && method.name.startsWith('#'))) {
            privateCount++;
        }
    }

    return privateCount;
}

/**
 * 10. SML (Strings of Message Links)
 * 메서드 연결 호출 (chaining)로 인한 에러 감지 복잡도. 예: obj.methodA().methodB().methodC() 
 */
export function calculateSML(classNode: AstNode): number {
    let maxSml = 0;

    function traverse(currentNode: AstNode) {
        if (currentNode.type === 'call_expression') {
            const smlTokens = findMethodChainLinks(currentNode);
            if (smlTokens > maxSml) {
                maxSml = smlTokens;
            }
        }

        if (currentNode.children) {
            for (const child of currentNode.children) {
                traverse(child);
            }
        }
    }

    traverse(classNode);
    // chaining 중첩 레벨
    return maxSml;
}

function findMethodChainLinks(callNode: AstNode): number {
    let chainLength = 1;
    let node: AstNode | undefined = callNode;

    while (node && node.type === 'call_expression') {
        let hasChainedCall = false;
        if (node.children) {
            for (const child of node.children) {
                if (child.type === 'member_expression') {
                    if (child.children) {
                        for (const innerChild of child.children) {
                            if (innerChild.type === 'call_expression') {
                                chainLength++;
                                node = innerChild;
                                hasChainedCall = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!hasChainedCall) break;
    }
    
    // 연결 수가 최소 2개 이상일 때만 SML로 산정.
    return chainLength >= 2 ? (chainLength - 1) : 0; 
}


// ============================================================================
// 유틸리티 함수 (클래스 맵 사전 계산 등)
// ============================================================================

export function buildClassMethodsMap(classNodes: AstNode[]): Map<string, number> {
    const classMethodsMap = new Map<string, number>();
    for (const classNode of classNodes) {
        const className = extractClassName(classNode);
        const methods = extractMethods(classNode);
        classMethodsMap.set(className, methods.length);
    }
    return classMethodsMap;
}

export function buildClassMethodNamesMap(classNodes: AstNode[]): Map<string, Set<string>> {
    const classMethodNamesMap = new Map<string, Set<string>>();
    for (const classNode of classNodes) {
        const className = extractClassName(classNode);
        const methods = extractMethods(classNode);
        const methodNames = new Set<string>();
        for (const method of methods) {
            const name = method.name || findMethodName(method);
            if (name) methodNames.add(name);
        }
        classMethodNamesMap.set(className, methodNames);
    }
    return classMethodNamesMap;
}

// ============================================================================
// 통합 OO Metrics 계산
// ============================================================================

export function calculateOOMetrics(
    classNode: AstNode,
    context?: ProjectContext,
): OOMetrics {
    const className = extractClassName(classNode);
    const inheritanceMap = context?.inheritanceMap || new Map();
    const classMethodsMap = context?.classMethodsMap || new Map<string, number>();
    const classMethodNamesMap = context?.classMethodNamesMap || new Map<string, Set<string>>();

    return {
        className,
        pmi: calculatePMI(classNode, inheritanceMap, classMethodsMap),
        pmis: calculatePMIS(classNode, inheritanceMap, classMethodsMap),
        dmc: calculateDMC(classNode),
        maa: calculateMAA(classNode),
        dac: isAbstractClass(classNode) ? 1 : 0, 
        pom: calculatePOM(classNode, inheritanceMap, classMethodNamesMap),
        ucgu: calculateUCGU(classNode),
        dcbo: calculateDCBO(classNode, className),
        prim: calculatePrIM(classNode),
        sml: calculateSML(classNode),
    };
}

// ----------------------------------------------------------------------------
// 헬퍼 복사 (ck-metrics에서 가져오기 불가능한 부분들 대비)
// ----------------------------------------------------------------------------
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

function collectAccessedFields(
    node: AstNode,
    fieldNames: Set<string>,
    accessed: Set<string>,
): void {
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
