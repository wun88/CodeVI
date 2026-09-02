import { diffLines } from 'diff';
import { useMemo, useState } from 'react';
import styles from './RefactoringSection.module.css';

type Hunk =
  | { type: 'context'; id: number; lines: string }
  | { type: 'change'; id: number; removed: string | null; added: string | null };

function buildHunks(before: string, after: string): Hunk[] {
  const parts = diffLines(before, after);
  const hunks: Hunk[] = [];
  let id = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      hunks.push({ type: 'context', id: id++, lines: part.value });
      continue;
    }
    if (part.removed) {
      // diffLines가 교체(replace)를 removed 파트 바로 뒤 added 파트로 표현하므로 한 hunk로 묶는다.
      const next = parts[i + 1];
      if (next?.added) {
        hunks.push({ type: 'change', id: id++, removed: part.value, added: next.value });
        i += 1;
      } else {
        hunks.push({ type: 'change', id: id++, removed: part.value, added: null });
      }
    } else {
      hunks.push({ type: 'change', id: id++, removed: null, added: part.value });
    }
  }
  return hunks;
}

function trimTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s.slice(0, -1) : s;
}

type Props = {
  before: string;
  after: string;
};

/**
 * BEFORE/AFTER를 줄 단위로 diff 떠서, 바뀐 구간(hunk)마다 적용/원본 유지를 토글할 수 있게 하고
 * 그 선택을 반영한 최종 코드를 조립해 보여준다. AI가 통째로 다시 쓴 코드를 무조건 전부
 * 받아들이거나 버리는 대신, 사용자가 원하는 변경만 골라 반영할 수 있게 하기 위함.
 */
export default function DiffHunkReview({ before, after }: Props) {
  const hunks = useMemo(() => buildHunks(before, after), [before, after]);
  const changeIds = useMemo(
    () => hunks.filter((h): h is Extract<Hunk, { type: 'change' }> => h.type === 'change').map((h) => h.id),
    [hunks],
  );
  // 기본값: 전부 적용(AI 제안 수락) — 마음에 안 드는 변경만 "원본 유지"로 끄는 흐름.
  const [accepted, setAccepted] = useState<Set<number>>(() => new Set(changeIds));

  const setHunkAccepted = (id: number, value: boolean) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const finalCode = useMemo(
    () =>
      hunks
        .map((h) => {
          if (h.type === 'context') return h.lines;
          return accepted.has(h.id) ? (h.added ?? '') : (h.removed ?? '');
        })
        .join(''),
    [hunks, accepted],
  );

  if (changeIds.length === 0) {
    // 변경이 전혀 없으면(예: AI 실패로 폴백 텍스트가 원본과 우연히 같은 경우는 사실상 없지만
    // 방어적으로) diff UI 없이 최종 코드만 그대로 보여준다.
    return (
      <div className={styles.diffFinal}>
        <div className={styles.blockHead}>최종 코드</div>
        <pre className={`${styles.code} ${styles.codeAfter}`}>{finalCode}</pre>
      </div>
    );
  }

  return (
    <div className={styles.diffReview}>
      <div className={styles.diffHunks}>
        {hunks.map((h) => {
          if (h.type === 'context') {
            const trimmed = trimTrailingNewline(h.lines);
            if (!trimmed) return null;
            return (
              <pre key={h.id} className={styles.diffContext}>
                {trimmed}
              </pre>
            );
          }

          const isAccepted = accepted.has(h.id);
          return (
            <div key={h.id} className={styles.diffHunk}>
              <div className={styles.diffHunkHead}>
                <span className={styles.diffHunkLabel}>변경 {changeIds.indexOf(h.id) + 1}</span>
                <div className={styles.diffToggle} role="group" aria-label="변경 적용 여부">
                  <button
                    type="button"
                    className={`${styles.diffToggleBtn} ${isAccepted ? styles.diffToggleActive : ''}`}
                    onClick={() => setHunkAccepted(h.id, true)}
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    className={`${styles.diffToggleBtn} ${!isAccepted ? styles.diffToggleActive : ''}`}
                    onClick={() => setHunkAccepted(h.id, false)}
                  >
                    원본 유지
                  </button>
                </div>
              </div>
              {h.removed && (
                <pre className={`${styles.diffLine} ${styles.diffRemoved} ${isAccepted ? styles.diffMuted : ''}`}>
                  {trimTrailingNewline(h.removed)
                    .split('\n')
                    .map((l, i) => (
                      <div key={i}>- {l}</div>
                    ))}
                </pre>
              )}
              {h.added && (
                <pre className={`${styles.diffLine} ${styles.diffAdded} ${!isAccepted ? styles.diffMuted : ''}`}>
                  {trimTrailingNewline(h.added)
                    .split('\n')
                    .map((l, i) => (
                      <div key={i}>+ {l}</div>
                    ))}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.diffFinal}>
        <div className={styles.diffHunkLabel}>
          최종 코드 ({accepted.size}/{changeIds.length}개 변경 적용됨)
        </div>
        <pre className={`${styles.code} ${styles.codeAfter}`}>{finalCode}</pre>
      </div>
    </div>
  );
}
