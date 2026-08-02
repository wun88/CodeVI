/**
 * examine 서비스(/codegraph)가 내려주는 언어 무관 캐노니컬 CodeGraph.
 *
 * 진실의 소스는 pyexamine 저장소의 `service/codegraph.py` 상단 계약 주석이며,
 * 모든 언어 어댑터(python/c/java/typescript)가 동일한 형태로 emit 한다.
 * 백엔드는 이 구조를 해석하지 않고 프론트로 그대로 전달한다 — 타입은 계약 문서 역할.
 */

export interface CodeGraphRange {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/** `{type, version, values}` 중첩 — 평면 숫자맵이 아니다. 소비 측에서 values 를 펴야 한다. */
export interface CodeGraphMetrics {
  type: string;
  version: string;
  /** 측정 불가한 지표는 null (예: 메서드 2개 미만 클래스의 LCOM). 0 과 구분할 것. */
  values: Record<string, number | null>;
}

export interface CodeGraphUnit {
  id: string;
  /** directory | file | class | method | function — 언어 어댑터가 추가 kind 를 낼 수 있어 string. */
  kind: string;
  language: string;
  name: string;
  qualname: string;
  file: string;
  range: CodeGraphRange | null;
  parentId: string | null;
  attributes: Record<string, unknown>;
  metrics: CodeGraphMetrics | null;
  metadata: Record<string, unknown>;
}

export interface CodeGraphRelation {
  /** inherits | imports | calls — 언어 어댑터가 추가 kind 를 낼 수 있어 string. */
  kind: string;
  sourceId: string;
  targetId: string;
}

export interface CodeGraphFinding {
  detector: string;
  category: string;
  /** unit.id(qualname)와 매칭된다. */
  entityId: string;
  location: { file: string; line: number };
  severity: string;
  metrics: Record<string, unknown>;
  message: string;
  backend: { language: string; parser: string; version: string };
}

/** UI 가 메트릭 목록을 하드코딩하지 않도록 examine 이 정의 자체를 실어 보낸다. */
export interface MetricCatalogEntry {
  key: string;
  label: string;
  description: string;
  /** lower_better | higher_better | context. */
  direction: string;
  applicableLanguages: string[];
}

export interface CanonicalCodeGraph {
  language: string;
  parser: string;
  units: CodeGraphUnit[];
  relations: CodeGraphRelation[];
  findings: CodeGraphFinding[];
  catalog: MetricCatalogEntry[];
}
