import { useEffect, useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type {
  DependencyList,
  DependencyType,
  ImpactAnalysis,
  MatchDetailItem,
  Requirement,
  RequirementStatus,
  RequirementVersion,
} from '../../interface/requirement.interface';
import FilterDropdown from './FilterDropdown';
import styles from './RequirementDetailModal.module.css';

const STATUS_LABEL: Record<RequirementStatus, string> = {
  draft: '초안',
  in_review: '리뷰중',
  approved: '승인됨',
  rejected: '반려됨',
  deprecated: '폐기됨',
};

// 백엔드 lib/status-transitions.ts의 전이 그래프와 1:1 대응 — 버튼 활성화 판단용 (jej_23 Phase 8)
const STATUS_TRANSITIONS: Record<RequirementStatus, RequirementStatus[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['deprecated', 'in_review'],
  rejected: ['in_review'],
  deprecated: [],
};

const DEPENDENCY_TYPE_LABEL: Record<DependencyType, string> = {
  depends_on: '의존',
  related: '연관',
  conflicts_with: '충돌',
  duplicates: '중복',
};

function diffContent(
  previousContent: string,
  currentContent: string,
): { field: string; before: unknown; after: unknown }[] {
  try {
    const before = JSON.parse(previousContent) as Record<string, unknown>;
    const after = JSON.parse(currentContent) as Record<string, unknown>;
    const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...fields]
      .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
      .map((field) => ({ field, before: before[field], after: after[field] }));
  } catch {
    return [];
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '(없음)';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(없음)';
  return String(value);
}

interface RequirementDetailModalProps {
  requirement: Requirement;
  allRequirements: Requirement[];
  onClose: () => void;
  onUpdated: (updated: Requirement) => void;
}

export default function RequirementDetailModal({
  requirement,
  allRequirements,
  onClose,
  onUpdated,
}: RequirementDetailModalProps) {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [baselineInput, setBaselineInput] = useState(requirement.baseline ?? '');
  const [baselineSaving, setBaselineSaving] = useState(false);
  const [baselineError, setBaselineError] = useState('');

  const [versions, setVersions] = useState<RequirementVersion[] | null>(null);
  const [dependencies, setDependencies] = useState<DependencyList | null>(null);
  const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
  const [matchDetail, setMatchDetail] = useState<MatchDetailItem[] | null>(null);
  const [detailError, setDetailError] = useState('');

  const [depTargetId, setDepTargetId] = useState('');
  const [depType, setDepType] = useState<DependencyType>('depends_on');
  const [depAdding, setDepAdding] = useState(false);
  const [depError, setDepError] = useState('');

  useEffect(() => {
    setBaselineInput(requirement.baseline ?? '');
  }, [requirement.baseline]);

  useEffect(() => {
    let cancelled = false;
    setDetailError('');
    Promise.all([
      requirementsService.getVersions(requirement.id),
      requirementsService.getDependencies(requirement.id),
      requirementsService.getImpact(requirement.id),
      requirementsService.getMappingDetail(requirement.id),
    ])
      .then(([versionsData, dependenciesData, impactData, matchDetailData]) => {
        if (cancelled) return;
        setVersions(versionsData);
        setDependencies(dependenciesData);
        setImpact(impactData);
        setMatchDetail(matchDetailData);
      })
      .catch(() => {
        if (!cancelled) setDetailError('상세 정보를 불러오지 못했습니다.');
      });
    return () => {
      cancelled = true;
    };
  }, [requirement.id]);

  const handleStatusChange = async (nextStatus: RequirementStatus) => {
    setStatusError('');
    setStatusUpdating(true);
    try {
      const updated = await requirementsService.update(requirement.id, { status: nextStatus });
      onUpdated(updated);
    } catch {
      setStatusError('상태 변경에 실패했습니다.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleBaselineSave = async () => {
    setBaselineError('');
    setBaselineSaving(true);
    try {
      const updated = await requirementsService.update(requirement.id, {
        baseline: baselineInput,
      });
      onUpdated(updated);
    } catch {
      setBaselineError('베이스라인 저장에 실패했습니다. (승인 상태에서만 지정할 수 있어요)');
    } finally {
      setBaselineSaving(false);
    }
  };

  const handleAddDependency = async () => {
    if (!depTargetId) return;
    setDepError('');
    setDepAdding(true);
    try {
      await requirementsService.addDependency(requirement.id, Number(depTargetId), depType);
      const [dependenciesData, impactData] = await Promise.all([
        requirementsService.getDependencies(requirement.id),
        requirementsService.getImpact(requirement.id),
      ]);
      setDependencies(dependenciesData);
      setImpact(impactData);
      setDepTargetId('');
    } catch {
      setDepError('의존관계 추가에 실패했습니다. (순환 참조이거나 이미 등록된 관계일 수 있어요)');
    } finally {
      setDepAdding(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: number) => {
    setDepError('');
    try {
      await requirementsService.removeDependency(requirement.id, dependencyId);
      const [dependenciesData, impactData] = await Promise.all([
        requirementsService.getDependencies(requirement.id),
        requirementsService.getImpact(requirement.id),
      ]);
      setDependencies(dependenciesData);
      setImpact(impactData);
    } catch {
      setDepError('의존관계 삭제에 실패했습니다.');
    }
  };

  const dependencyCandidates = allRequirements.filter((r) => r.id !== requirement.id);
  const nextStatuses = STATUS_TRANSITIONS[requirement.status];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{requirement.title}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {detailError && <p className={styles.errorText}>{detailError}</p>}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>상태</h3>
            <div className={styles.statusRow}>
              <span className={styles.currentStatus}>{STATUS_LABEL[requirement.status]}</span>
              {nextStatuses.length > 0 && (
                <div className={styles.statusButtons}>
                  {nextStatuses.map((next) => (
                    <button
                      key={next}
                      type="button"
                      className={styles.smallBtn}
                      disabled={statusUpdating}
                      onClick={() => handleStatusChange(next)}
                    >
                      → {STATUS_LABEL[next]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {statusError && <p className={styles.errorText}>{statusError}</p>}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>베이스라인</h3>
            <div className={styles.baselineRow}>
              <input
                type="text"
                className={styles.textInput}
                placeholder="예: v1.0-release"
                value={baselineInput}
                onChange={(e) => setBaselineInput(e.target.value)}
                disabled={requirement.status !== 'approved'}
              />
              <button
                type="button"
                className={styles.smallBtn}
                onClick={handleBaselineSave}
                disabled={baselineSaving || requirement.status !== 'approved'}
              >
                저장
              </button>
            </div>
            {requirement.status !== 'approved' && (
              <p className={styles.hintText}>승인(approved) 상태에서만 지정할 수 있습니다.</p>
            )}
            {baselineError && <p className={styles.errorText}>{baselineError}</p>}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>영향분석</h3>
            {!impact ? (
              <p className={styles.hintText}>불러오는 중...</p>
            ) : (
              <div className={styles.impactGrid}>
                <div>
                  <p className={styles.impactLabel}>연결된 코드 파일 ({impact.linkedCodeFiles.length})</p>
                  <p className={styles.impactValue}>
                    {impact.linkedCodeFiles.length > 0 ? impact.linkedCodeFiles.join(', ') : '없음'}
                  </p>
                </div>
                <div>
                  <p className={styles.impactLabel}>연결된 문서 ({impact.linkedDocuments.length})</p>
                  <p className={styles.impactValue}>
                    {impact.linkedDocuments.length > 0 ? impact.linkedDocuments.join(', ') : '없음'}
                  </p>
                </div>
                <div>
                  <p className={styles.impactLabel}>연결된 빌드 ({impact.linkedBuilds.length})</p>
                  <p className={styles.impactValue}>
                    {impact.linkedBuilds.length > 0 ? impact.linkedBuilds.join(', ') : '없음'}
                  </p>
                </div>
                <div>
                  <p className={styles.impactLabel}>연결된 테스트 ({impact.linkedTests.length})</p>
                  <p className={styles.impactValue}>
                    {impact.linkedTests.length > 0 ? impact.linkedTests.join(', ') : '없음'}
                  </p>
                </div>
              </div>
            )}

            {matchDetail && matchDetail.length > 0 && (
              <div className={styles.matchList}>
                <p className={styles.impactLabel}>매칭된 코드 요소 (상위 {matchDetail.length}개)</p>
                <ul className={styles.matchItems}>
                  {matchDetail.map((m, index) => (
                    <li key={`${m.path}-${m.name}-${index}`} className={styles.matchItem}>
                      <span className={styles.matchType}>{m.type}</span>
                      <div className={styles.matchInfo}>
                        <span className={styles.matchName}>{m.name}</span>
                        <span className={styles.matchPath}>{m.path}</span>
                      </div>
                      <span className={styles.matchScore}>{m.score}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>의존관계</h3>
            <div className={styles.depAddRow}>
              <FilterDropdown
                ariaLabel="대상 요구사항 선택"
                value={depTargetId}
                onChange={setDepTargetId}
                options={[
                  { value: '', label: '대상 요구사항 선택' },
                  ...dependencyCandidates.map((r) => ({ value: String(r.id), label: r.title })),
                ]}
              />
              <FilterDropdown
                ariaLabel="의존관계 유형 선택"
                value={depType}
                onChange={setDepType}
                options={Object.entries(DEPENDENCY_TYPE_LABEL).map(([value, label]) => ({
                  value: value as DependencyType,
                  label,
                }))}
              />
              <button
                type="button"
                className={styles.smallBtn}
                onClick={handleAddDependency}
                disabled={depAdding || !depTargetId}
              >
                추가
              </button>
            </div>
            {depError && <p className={styles.errorText}>{depError}</p>}

            {!dependencies ? (
              <p className={styles.hintText}>불러오는 중...</p>
            ) : (
              <div className={styles.depColumns}>
                <div>
                  <p className={styles.depColumnTitle}>나가는 관계 ({dependencies.outgoing.length})</p>
                  {dependencies.outgoing.length === 0 ? (
                    <p className={styles.hintText}>없음</p>
                  ) : (
                    <ul className={styles.depList}>
                      {dependencies.outgoing.map((d) => (
                        <li key={d.id} className={styles.depItem}>
                          <span>
                            {DEPENDENCY_TYPE_LABEL[d.type]} → {d.title}
                          </span>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => handleRemoveDependency(d.id)}
                          >
                            삭제
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className={styles.depColumnTitle}>들어오는 관계 ({dependencies.incoming.length})</p>
                  {dependencies.incoming.length === 0 ? (
                    <p className={styles.hintText}>없음</p>
                  ) : (
                    <ul className={styles.depList}>
                      {dependencies.incoming.map((d) => (
                        <li key={d.id} className={styles.depItem}>
                          <span>
                            {d.title} → {DEPENDENCY_TYPE_LABEL[d.type]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>변경 이력</h3>
            {!versions ? (
              <p className={styles.hintText}>불러오는 중...</p>
            ) : versions.length === 0 ? (
              <p className={styles.hintText}>아직 내용 변경 이력이 없습니다.</p>
            ) : (
              <ul className={styles.versionList}>
                {versions.map((v) => {
                  const diffs = diffContent(v.previousContent, v.currentContent);
                  return (
                    <li key={v.id} className={styles.versionItem}>
                      <div className={styles.versionHeader}>
                        <span className={styles.versionTag}>v{v.version}</span>
                        <span className={styles.versionDate}>
                          {new Date(v.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      {diffs.length > 0 && (
                        <ul className={styles.diffList}>
                          {diffs.map((d) => (
                            <li key={d.field} className={styles.diffItem}>
                              <span className={styles.diffField}>{d.field}</span>
                              <span className={styles.diffBefore}>{formatValue(d.before)}</span>
                              <span className={styles.diffArrow}>→</span>
                              <span className={styles.diffAfter}>{formatValue(d.after)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
