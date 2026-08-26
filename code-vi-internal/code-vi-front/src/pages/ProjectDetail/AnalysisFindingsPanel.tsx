import { useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type { AnalysisFinding } from '../../interface/requirement.interface';
import styles from './AnalysisFindingsPanel.module.css';

const FINDING_TYPE_LABEL: Record<string, string> = {
  duplicate: '중복',
  conflict: '충돌',
  omission: '누락',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: '치명',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

interface AnalysisFindingsPanelProps {
  teamProjectId: number;
  recentFindings: AnalysisFinding[];
  onNavigateToRequirement: (requirementId: number) => void;
}

/**
 * AI 인사이트 카드의 "전체 보기" 인라인 확장 (jej_23 Phase 12) — 별도 라우트 없이 같은 카드 안에서
 * findings 테이블 + 우측 설명 패널이 펼쳐진다. 원본의 "권장조치" 버튼(요구사항 병합/정책검토 등)은
 * 실제 동작하지 않는 미구현이었으므로, 실제로 동작하는 "요구사항으로 이동"만 남긴다.
 */
export default function AnalysisFindingsPanel({
  teamProjectId,
  recentFindings,
  onNavigateToRequirement,
}: AnalysisFindingsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [allFindings, setAllFindings] = useState<AnalysisFinding[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !allFindings) {
      setLoading(true);
      setError('');
      requirementsService
        .getAllFindings(teamProjectId)
        .then((data) => setAllFindings(data))
        .catch(() => setError('전체 findings를 불러오지 못했습니다.'))
        .finally(() => setLoading(false));
    }
  };

  const selectedFinding = allFindings?.find((f) => f.id === selectedId) ?? null;

  if (!expanded) {
    return (
      <>
        <button type="button" className={styles.toggleBtn} onClick={handleToggle} disabled={recentFindings.length === 0}>
          전체 보기
        </button>
        {recentFindings.length === 0 ? (
          <p className={styles.hintText}>
            아직 분석 결과가 없습니다. &quot;AI 분석 실행&quot;을 눌러 중복/충돌/누락 후보를 확인하세요.
          </p>
        ) : (
          <ul className={styles.list}>
            {recentFindings.map((finding) => (
              <li key={finding.id} className={styles.item}>
                <span className={styles.itemType}>{FINDING_TYPE_LABEL[finding.type] ?? finding.type}</span>
                <p className={styles.itemDesc}>{finding.description}</p>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <div className={styles.expanded}>
      <button type="button" className={styles.toggleBtn} onClick={handleToggle}>
        접기
      </button>
      {loading && <p className={styles.hintText}>불러오는 중...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {allFindings && (
        <div className={styles.expandedBody}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>유형</th>
                  <th>요구사항</th>
                  <th>심각도</th>
                  <th>신뢰도</th>
                </tr>
              </thead>
              <tbody>
                {allFindings.map((f) => (
                  <tr
                    key={f.id}
                    className={`${styles.row} ${f.id === selectedId ? styles.rowActive : ''}`}
                    onClick={() => setSelectedId(f.id)}
                  >
                    <td>{FINDING_TYPE_LABEL[f.type] ?? f.type}</td>
                    <td>{f.requirementIds.map((id) => `#${id}`).join(', ')}</td>
                    <td>{SEVERITY_LABEL[f.severity] ?? f.severity}</td>
                    <td>{Math.round(f.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.detailPanel}>
            {!selectedFinding ? (
              <p className={styles.hintText}>행을 선택하면 설명이 표시됩니다.</p>
            ) : (
              <>
                <p className={styles.detailDesc}>{selectedFinding.description}</p>
                {selectedFinding.aiExplanation && (
                  <p className={styles.detailExplanation}>{selectedFinding.aiExplanation}</p>
                )}
                {selectedFinding.requirementIds.length > 0 && (
                  <button
                    type="button"
                    className={styles.navigateBtn}
                    onClick={() => onNavigateToRequirement(selectedFinding.requirementIds[0])}
                  >
                    요구사항으로 이동 →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
