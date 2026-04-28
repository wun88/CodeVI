// ============================================================
// AST Data Interfaces — Based on actual API response (snapshotId=55)
// ⚠️ Key differences from expected:
//   - directories is a FLAT array (not nested)
//   - file-level functions use key: fileFunctions
//   - class-level functions use key: methods
//   - entries with name==='class' are Tree-sitter artifacts → filter out
// ============================================================

export interface AstClassMetrics {
  cbo: number;
  rfc: number;
  lcom: number;
  wmc: number;
  dit: number;
  noc: number;
}

export interface AstMethodCall {
  callerId: number;
  calleeId: number;
}

/** 클래스 메서드 또는 파일-레벨 함수 */
export interface AstFunction {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  fileId: number | null;        // 메서드(class method)인 경우 null
  classId: number | null;       // 파일-레벨 함수인 경우 null
  parentFunctionId: number | null;
  childFunctions?: AstFunction[];
}

/** 파일 내 클래스 엔티티 */
export interface AstClass {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;                 // 'class' 이름은 Tree-sitter 아티팩트 → 필터링
  fileId: number;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  methods: AstFunction[];       // ⚠️ 'functions'가 아닌 'methods'
  parentClassId: number | null;
  parentFunctionId: number | null;
  metrics?: AstClassMetrics;
}

/** 디렉토리 내 파일 */
export interface AstFile {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  directoryId: number;
  classes: AstClass[];          // ⚠️ name==='class' 아티팩트 필터링 필요
  fileFunctions: AstFunction[]; // ⚠️ 'functions'가 아닌 'fileFunctions'
}

/** 디렉토리 (API는 flat 배열로 반환 — parentDirectoryId로 트리 재구성 필요) */
export interface AstDirectory {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  snapshotId: number;
  parentDirectoryId: number | null;
  childDirectories: Pick<AstDirectory, 'id' | 'name' | 'snapshotId' | 'parentDirectoryId'>[];
  files: AstFile[];
}

export interface AstSnapshot {
  id: number;
  createdAt: string;
  updatedAt: string;
  teamProjectId: number;
  directories: AstDirectory[];  // flat 배열
  methodCalls?: AstMethodCall[]; // 메서드 호출 관계
}

/** flat 배열 → 트리 변환 후 사용하는 타입 */
export interface AstTreeDirectory extends AstDirectory {
  treeChildren: AstTreeDirectory[];
}

/** 스냅샷 목록 조회 시 사용 (개별 스냅샷 요약) */
export interface AstSnapshotSummary {
  id: number;
  buildNumber?: number;
  createdAt: string;
  teamProjectId: number;
}
