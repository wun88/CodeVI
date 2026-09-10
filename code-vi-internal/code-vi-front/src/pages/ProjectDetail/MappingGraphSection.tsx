import { useEffect, useMemo, useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type {
  MappingSummary,
  MatchDetailItem,
  Requirement,
} from '../../interface/requirement.interface';
import { buildCodeMatchDetails } from '../../utils/relationshipGraph';
import RelationshipGraph from '../../components/RelationshipGraph/RelationshipGraph';
import FilterDropdown from './FilterDropdown';
import styles from './MappingGraphSection.module.css';

interface MappingGraphSectionProps {
  requirements: Requirement[];
  mapping: MappingSummary;
}

/**
 * "요구사항-코드 매핑" 카드의 관계 그래프 — 요구사항 하나를 골라 그 요구사항과 연관된
 * 코드 파일을 유사도 기반으로 잇는다. mapping-detail은 요구사항 단위 API라 프로젝트
 * 전체를 한 번에 그릴 수 없어(선택할 때마다 1건 호출) 드롭다운으로 대상을 고른다.
 */
export default function MappingGraphSection({
  requirements,
  mapping,
}: MappingGraphSectionProps) {
  // 매핑 점수가 실제로 산출된 요구사항만 대상이다 — 미매핑 항목은 그릴 간선이 없다.
  const mappedRequirements = useMemo(() => {
    const scoreById = new Map(
      mapping.requirements.map((item) => [item.requirementId, item]),
    );
    return requirements
      .filter((req) => (scoreById.get(req.id)?.matchCount ?? 0) > 0)
      .sort(
        (a, b) =>
          (scoreById.get(b.id)?.implementationScore ?? 0) -
          (scoreById.get(a.id)?.implementationScore ?? 0),
      );
  }, [requirements, mapping.requirements]);

  /** 사용자가 드롭다운으로 고른 값. 미선택이거나 목록에서 사라지면 아래에서 기본값으로 떨어진다. */
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    requirementId: number;
    items: MatchDetailItem[];
  } | null>(null);
  /** 조회에 실패한 요구사항 id — 로딩/에러 표시는 이 값과 detail에서 파생한다. */
  const [failedId, setFailedId] = useState<number | null>(null);
  /**
   * 선택한 코드 파일을 요구사항 id와 함께 들고 있는다 — 요구사항이 바뀌면 effect로 초기화하지
   * 않고 파생 단계에서 자연히 무효가 된다(effect 내 동기 setState 금지 규칙).
   */
  const [fileSelection, setFileSelection] = useState<{
    requirementId: number;
    codeFileId: string;
  } | null>(null);

  // 기본 선택은 매핑 점수가 가장 높은 요구사항 — 상태 동기화 대신 렌더 시점에 파생한다.
  const selectedId =
    pickedId !== null && mappedRequirements.some((req) => req.id === pickedId)
      ? pickedId
      : (mappedRequirements[0]?.id ?? null);

  // effect 본문에서 동기 setState를 하지 않는다(react-hooks/set-state-in-effect) —
  // 로딩/에러는 아래에서 응답 상태로부터 파생한다.
  useEffect(() => {
    if (selectedId === null) return;
    let cancelled = false;
    requirementsService
      .getMappingDetail(selectedId)
      .then((items) => {
        if (!cancelled) setDetail({ requirementId: selectedId, items });
      })
      .catch(() => {
        if (!cancelled) setFailedId(selectedId);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedRequirement =
    mappedRequirements.find((req) => req.id === selectedId) ?? null;
  // 다른 요구사항의 응답이 남아 있는 동안 엉뚱한 그래프를 그리지 않도록 id를 대조한다.
  const dataReady = detail !== null && detail.requirementId === selectedId;
  const failed = !dataReady && failedId === selectedId;
  const loading = selectedId !== null && !dataReady && !failed;
  const codeMatches = dataReady ? buildCodeMatchDetails(detail.items) : [];
  const selectedFile =
    fileSelection && fileSelection.requirementId === selectedId
      ? fileSelection.codeFileId
      : null;

  if (mappedRequirements.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.controlRow}>
        <span className={styles.controlLabel}>관계 그래프</span>
        <div className={styles.selectWrap}>
          <FilterDropdown
            ariaLabel="그래프로 볼 요구사항 선택"
            value={String(selectedId ?? '')}
            options={mappedRequirements.map((req) => ({
              value: String(req.id),
              label: `REQ-${req.id} · ${req.title}`,
            }))}
            onChange={(value) => setPickedId(Number(value))}
          />
        </div>
      </div>

      {failed && (
        <p className={styles.statusText}>매핑 상세를 불러오지 못했습니다.</p>
      )}
      {loading && <p className={styles.statusText}>그래프를 불러오는 중...</p>}

      {dataReady && selectedRequirement && (
        <RelationshipGraph
          requirement={selectedRequirement}
          matches={codeMatches}
          selectedFile={selectedFile}
          onSelectFile={(codeFileId) =>
            setFileSelection((current) =>
              current?.requirementId === selectedId && current.codeFileId === codeFileId
                ? null
                : { requirementId: selectedId, codeFileId },
            )
          }
        />
      )}
    </div>
  );
}
