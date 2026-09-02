import type {
  AstSnapshot,
  AstDirectory,
  AstFile,
  AstClass,
  AstFunction,
  AstMethodCall,
} from '../interface/ast.interface';

/**
 * ⚠️ UI 가독성 테스트용 대용량 더미 스냅샷 생성기.
 * 실제 스냅샷(디렉토리 ~140 / 파일 ~486 / 클래스·함수 ~2,600, tests 51개 파일)과
 * 같은 규모를 결정적(seed 고정)으로 재현한다. advanced_pyexamine 스타일의 Python 프로젝트 구조.
 */

const TS = '2026-07-10T03:03:06.000Z';

/* 결정적 의사난수 (mulberry32) — 렌더마다 동일한 트리 보장 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260710);
const randInt = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

const SMELLS = [
  'long_method', 'large_class', 'long_parameter_list', 'data_clumps', 'primitive_obsession',
  'feature_envy', 'inappropriate_intimacy', 'message_chains', 'middle_man', 'god_class',
  'shotgun_surgery', 'divergent_change', 'parallel_inheritance', 'lazy_class', 'dead_code',
  'speculative_generality', 'temporary_field', 'refused_bequest', 'switch_statements',
  'duplicate_code', 'comments_smell', 'complex_conditional', 'improper_api_usage',
  'incomplete_library_class', 'global_data', 'mutable_data',
];

const PKG_NAMES = [
  'core', 'analyzers', 'detectors', 'metrics', 'parsers', 'reporters', 'utils', 'config',
  'models', 'visitors', 'rules', 'cli', 'formatters', 'aggregators', 'io', 'cache',
  'pipeline', 'schema', 'validation', 'exporters', 'loaders', 'plugins', 'runners', 'hooks',
];
const SUB_NAMES = ['base', 'impl', 'helpers', 'python', 'ast', 'report', 'common', 'internal', 'ext', 'v2'];
const FILE_NOUNS = [
  'analyzer', 'detector', 'metric', 'parser', 'reporter', 'visitor', 'rule', 'formatter',
  'aggregator', 'loader', 'exporter', 'runner', 'registry', 'context', 'resolver', 'builder',
  'scanner', 'collector', 'tracker', 'mapper', 'filter', 'handler', 'adapter', 'factory',
];
const FN_VERBS = [
  'analyze', 'detect', 'parse', 'collect', 'resolve', 'build', 'format', 'aggregate',
  'load', 'export', 'run', 'scan', 'visit', 'apply', 'validate', 'transform', 'merge', 'emit',
];
const FN_NOUNS = [
  'project', 'module', 'node', 'tree', 'metrics', 'report', 'smells', 'classes', 'imports',
  'calls', 'thresholds', 'entries', 'results', 'findings', 'config', 'source',
];

let dirSeq = 10000;
let fileSeq = 20000;
let fnSeq = 30000;
let classSeq = 40000;

const SNAPSHOT_ID = 4;
const directories: AstDirectory[] = [];
const allMethodIds: number[] = [];

function makeFn(name: string, classId: number | null, fileId: number | null, startLine: number): AstFunction {
  const id = fnSeq++;
  if (classId !== null) allMethodIds.push(id);
  return {
    id,
    name,
    startLine,
    startCol: classId !== null ? 4 : 0,
    endLine: startLine + randInt(4, 38),
    endCol: 0,
    fileId,
    classId,
    parentFunctionId: null,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeClass(name: string, fileId: number, methodCount: number): AstClass {
  const id = classSeq++;
  const startLine = randInt(5, 40);
  let line = startLine + 2;
  const methods: AstFunction[] = [];
  for (let i = 0; i < methodCount; i += 1) {
    const fn = makeFn(`${pick(FN_VERBS)}_${pick(FN_NOUNS)}`, id, null, line);
    line = fn.endLine + 2;
    methods.push(fn);
  }
  return {
    id,
    name,
    startLine,
    startCol: 0,
    endLine: line + 2,
    endCol: 0,
    fileId,
    parentClassId: null,
    parentFunctionId: null,
    createdAt: TS,
    updatedAt: TS,
    metrics: {
      cbo: randInt(0, 14),
      rfc: randInt(2, 40),
      lcom: randInt(0, 95),
      wmc: randInt(2, 30),
      dit: randInt(0, 4),
      noc: randInt(0, 3),
    },
    methods,
  };
}

function makeModuleFile(dirId: number): AstFile {
  const id = fileSeq++;
  const name = `${pick(FILE_NOUNS)}_${pick(FILE_NOUNS)}.py`;
  const classes: AstClass[] = [];
  const fileFunctions: AstFunction[] = [];
  const classCount = randInt(0, 2);
  for (let i = 0; i < classCount; i += 1) {
    const cls = `${pick(FILE_NOUNS)}${pick(['Base', 'Impl', 'Mixin', 'Registry', 'Visitor', 'Detector'])}`;
    classes.push(makeClass(cls.charAt(0).toUpperCase() + cls.slice(1), id, randInt(2, 7)));
  }
  const fnCount = randInt(0, 3);
  let line = 200;
  for (let i = 0; i < fnCount; i += 1) {
    const fn = makeFn(`${pick(FN_VERBS)}_${pick(FN_NOUNS)}`, null, id, line);
    line = fn.endLine + 2;
    fileFunctions.push(fn);
  }
  return { id, name, directoryId: dirId, classes, fileFunctions, createdAt: TS, updatedAt: TS };
}

function makeTestFile(dirId: number, smell: string, variant: string): AstFile {
  const id = fileSeq++;
  const fileFunctions: AstFunction[] = [];
  let line = 10;
  const cases = ['detects', 'ignores_safe_code', 'threshold_boundary', 'reports_location'];
  const caseCount = randInt(3, 4);
  for (let i = 0; i < caseCount; i += 1) {
    const fn = makeFn(`test_${cases[i]}_${smell}`, null, id, line);
    line = fn.endLine + 2;
    fileFunctions.push(fn);
  }
  fileFunctions.push(makeFn('_run', null, id, line));
  return {
    id,
    name: `test_${smell}${variant}.py`,
    directoryId: dirId,
    classes: [],
    fileFunctions,
    createdAt: TS,
    updatedAt: TS,
  };
}

function makeDir(name: string, parentDirectoryId: number | null): AstDirectory {
  const dir: AstDirectory = {
    id: dirSeq++,
    name,
    snapshotId: SNAPSHOT_ID,
    parentDirectoryId,
    childDirectories: [],
    files: [],
    createdAt: TS,
    updatedAt: TS,
  };
  directories.push(dir);
  if (parentDirectoryId !== null) {
    const parent = directories.find((d) => d.id === parentDirectoryId);
    parent?.childDirectories.push({
      id: dir.id,
      name: dir.name,
      snapshotId: SNAPSHOT_ID,
      parentDirectoryId,
    });
  }
  return dir;
}

/* ── 트리 구성 ───────────────────────────────────────────── */
const DIR_TARGET = 140;
const FILE_TARGET = 486;

const root = makeDir('advanced_pyexamine', null);
const srcRoot = makeDir('advanced_pyexamine', root.id);
const testsDir = makeDir('tests', root.id);

// tests: 51개 파일 (smell 26종 × 기본/edge 변형)
let testCount = 0;
outer: for (const variant of ['', '_edge_cases']) {
  for (const smell of SMELLS) {
    if (testCount >= 51) break outer;
    testsDir.files.push(makeTestFile(testsDir.id, smell, variant));
    testCount += 1;
  }
}

// src 하위 패키지: DIR_TARGET까지 2~3레벨로 확장
const expandable: AstDirectory[] = [];
for (const pkg of PKG_NAMES) {
  if (directories.length >= DIR_TARGET) break;
  expandable.push(makeDir(pkg, srcRoot.id));
}
let cursor = 0;
while (directories.length < DIR_TARGET && cursor < expandable.length) {
  const parent = expandable[cursor];
  cursor += 1;
  const childCount = randInt(2, 5);
  for (let i = 0; i < childCount && directories.length < DIR_TARGET; i += 1) {
    const child = makeDir(`${SUB_NAMES[i % SUB_NAMES.length]}`, parent.id);
    if (rng() < 0.45) expandable.push(child);
  }
}

// 파일 분배: tests 제외 모든 디렉토리에 순환 배분
const moduleDirs = directories.filter((d) => d.id !== testsDir.id && d.id !== root.id);
let fileCount = testCount;
let dirIdx = 0;
while (fileCount < FILE_TARGET) {
  const dir = moduleDirs[dirIdx % moduleDirs.length];
  dirIdx += 1;
  const batch = randInt(1, 3);
  for (let i = 0; i < batch && fileCount < FILE_TARGET; i += 1) {
    dir.files.push(makeModuleFile(dir.id));
    fileCount += 1;
  }
}

// 메서드 호출 관계
const methodCalls: AstMethodCall[] = [];
for (let i = 0; i < 220; i += 1) {
  const caller = pick(allMethodIds);
  const callee = pick(allMethodIds);
  if (caller !== callee) methodCalls.push({ callerId: caller, calleeId: callee });
}

export const dummySnapshotDetailLarge: AstSnapshot = {
  id: SNAPSHOT_ID,
  createdAt: TS,
  updatedAt: TS,
  teamProjectId: 1,
  directories,
  methodCalls,
};
