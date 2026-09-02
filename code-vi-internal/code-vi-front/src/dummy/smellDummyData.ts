import { dummySnapshotDetailLarge } from './astDummyDataLarge';
import type { SmellFinding, SmellSeverity } from '../utils/smellOverlay';

/**
 * ⚠️ UI 데모용 더미 스멜 findings.
 * astDummyDataLarge의 트리에서 결정적(seed 고정)으로 생성 —
 * filePath/entity/라인이 실제 노드와 일치해서 smellOverlay 매핑 로직을 그대로 검증한다.
 * 실 연동 시 smell-analysis API 응답으로 교체된다.
 */

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

const rng = mulberry32(20260830);

const SMELL_POOL: { name: string; severity: SmellSeverity }[] = [
  { name: 'long_method', severity: 'high' },
  { name: 'god_class', severity: 'high' },
  { name: 'large_class', severity: 'high' },
  { name: 'data_clumps', severity: 'medium' },
  { name: 'feature_envy', severity: 'medium' },
  { name: 'long_parameter_list', severity: 'medium' },
];

function buildFindings(): SmellFinding[] {
  const dirs = dummySnapshotDetailLarge.directories;
  const byId = new Map(dirs.map((d) => [d.id, d]));
  const pathCache = new Map<number, string>();
  const pathOf = (id: number): string => {
    const cached = pathCache.get(id);
    if (cached) return cached;
    const d = byId.get(id)!;
    const p = d.parentDirectoryId == null ? d.name : `${pathOf(d.parentDirectoryId)}/${d.name}`;
    pathCache.set(id, p);
    return p;
  };

  const findings: SmellFinding[] = [];
  dirs.forEach((dir) => {
    dir.files.forEach((file) => {
      if (rng() > 0.22) return; // 약 22%의 파일에만 스멜 부여
      const entities = [
        ...file.classes.flatMap((c) =>
          c.methods.map((m) => ({ name: m.name, start: m.startLine, end: m.endLine }))
        ),
        ...file.fileFunctions.map((fn) => ({ name: fn.name, start: fn.startLine, end: fn.endLine })),
      ];
      const count = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i += 1) {
        const smell = SMELL_POOL[Math.floor(rng() * SMELL_POOL.length)];
        const ent =
          entities.length && rng() < 0.7
            ? entities[Math.floor(rng() * entities.length)]
            : null;
        findings.push({
          name: smell.name,
          severity: smell.severity,
          filePath: `${pathOf(dir.id)}/${file.name}`,
          lineStart: ent?.start ?? 1,
          lineEnd: ent?.end ?? 40,
          entity: ent?.name ?? null,
        });
      }
    });
  });
  return findings;
}

export const dummySmellFindings: SmellFinding[] = buildFindings();
