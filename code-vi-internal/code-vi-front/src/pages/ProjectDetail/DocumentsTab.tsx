import { useEffect, useState } from 'react';
import { requirementsService } from '../../services/requirementsService';
import type {
  DocumentQualityCheck,
  DocumentType,
  GeneratedDocument,
  Requirement,
} from '../../interface/requirement.interface';
import FilterDropdown from './FilterDropdown';
import styles from './DocumentsTab.module.css';

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  srs: 'SRS',
  prd: 'PRD',
  brs: 'BRS',
};

function toMarkdown(document: GeneratedDocument): string {
  return [
    `# ${document.title}`,
    ...document.sections.map((s) => `## ${s.title}\n\n${s.content}`),
  ].join('\n\n');
}

interface DocumentsTabProps {
  teamProjectId: number;
  requirements: Requirement[];
}

export default function DocumentsTab({ teamProjectId, requirements }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<GeneratedDocument[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);

  const [genType, setGenType] = useState<DocumentType>('srs');
  const [genRequirementIds, setGenRequirementIds] = useState<number[]>([]);
  const [genIncludeTraceability, setGenIncludeTraceability] = useState(true);
  const [genIncludeNfr, setGenIncludeNfr] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const [quality, setQuality] = useState<DocumentQualityCheck | null>(null);
  const [sectionBusy, setSectionBusy] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListError('');
    requirementsService
      .listDocuments(teamProjectId)
      .then((docs) => {
        if (cancelled) return;
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocumentId(docs[0].id);
      })
      .catch(() => {
        if (!cancelled) setListError('문서를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamProjectId]);

  const selectedDocument = documents?.find((d) => d.id === selectedDocumentId) ?? null;

  useEffect(() => {
    if (!selectedDocument) {
      setQuality(null);
      return;
    }
    let cancelled = false;
    requirementsService
      .getDocumentQuality(teamProjectId, selectedDocument.id)
      .then((q) => {
        if (!cancelled) setQuality(q);
      })
      .catch(() => {
        if (!cancelled) setQuality(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamProjectId, selectedDocument?.id, selectedDocument?.sections]);

  const toggleGenRequirement = (id: number) => {
    setGenRequirementIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
    if (genRequirementIds.length === 0) {
      setGenError('요구사항을 하나 이상 선택하세요.');
      return;
    }
    setGenError('');
    setGenerating(true);
    try {
      const doc = await requirementsService.generateDocument(teamProjectId, genType, genRequirementIds, {
        includeTraceability: genIncludeTraceability,
        includeNfr: genIncludeNfr,
      });
      setDocuments((prev) => [doc, ...(prev ?? [])]);
      setSelectedDocumentId(doc.id);
      setGenRequirementIds([]);
    } catch {
      setGenError('문서 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSectionEdit = async (sectionId: string, content: string) => {
    if (!selectedDocument) return;
    setSectionError('');
    setSectionBusy(sectionId);
    try {
      const updated = await requirementsService.updateDocumentSection(
        teamProjectId,
        selectedDocument.id,
        sectionId,
        content,
      );
      setDocuments((prev) => prev?.map((d) => (d.id === updated.id ? updated : d)) ?? prev);
    } catch {
      setSectionError('섹션 저장에 실패했습니다.');
    } finally {
      setSectionBusy(null);
    }
  };

  const handleRegenerateSection = async (sectionId: string) => {
    if (!selectedDocument) return;
    setSectionError('');
    setSectionBusy(sectionId);
    try {
      const updated = await requirementsService.regenerateDocumentSection(
        teamProjectId,
        selectedDocument.id,
        sectionId,
      );
      setDocuments((prev) => prev?.map((d) => (d.id === updated.id ? updated : d)) ?? prev);
    } catch {
      setSectionError('템플릿 재생성에 실패했습니다.');
    } finally {
      setSectionBusy(null);
    }
  };

  const handleCopyMarkdown = () => {
    if (!selectedDocument) return;
    navigator.clipboard.writeText(toMarkdown(selectedDocument)).then(() => {
      setCopyFeedback('클립보드에 복사했습니다.');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  if (loading) return <p className={styles.hintText}>불러오는 중...</p>;
  if (listError) return <p className={styles.errorText}>{listError}</p>;

  return (
    <div className={styles.wrapper}>
      <section className={styles.generateCard}>
        <h3 className={styles.sectionTitle}>새 문서 생성</h3>
        <div className={styles.generateRow}>
          <FilterDropdown
            ariaLabel="문서 종류 선택"
            value={genType}
            onChange={setGenType}
            options={Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => ({
              value: value as DocumentType,
              label,
            }))}
          />
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={genIncludeTraceability}
              onChange={(e) => setGenIncludeTraceability(e.target.checked)}
            />
            추적성 매트릭스 포함
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={genIncludeNfr}
              onChange={(e) => setGenIncludeNfr(e.target.checked)}
            />
            비기능 요구사항 포함
          </label>
        </div>

        <p className={styles.hintText}>포함할 요구사항 선택 ({genRequirementIds.length}개 선택됨)</p>
        <div className={styles.reqCheckboxList}>
          {requirements.length === 0 ? (
            <p className={styles.hintText}>등록된 요구사항이 없습니다.</p>
          ) : (
            requirements.map((r) => (
              <label key={r.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={genRequirementIds.includes(r.id)}
                  onChange={() => toggleGenRequirement(r.id)}
                />
                {r.title}
              </label>
            ))
          )}
        </div>

        {genError && <p className={styles.errorText}>{genError}</p>}
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleGenerate}
          disabled={generating || requirements.length === 0}
        >
          {generating ? '생성 중...' : '문서 생성'}
        </button>
      </section>

      {documents && documents.length > 0 && (
        <div className={styles.body}>
          <aside className={styles.docListPanel}>
            <h3 className={styles.sectionTitle}>생성된 문서 ({documents.length})</h3>
            <ul className={styles.docList}>
              {documents.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`${styles.docListItem} ${d.id === selectedDocumentId ? styles.docListItemActive : ''}`}
                    onClick={() => setSelectedDocumentId(d.id)}
                  >
                    <span className={styles.docTypeTag}>{DOCUMENT_TYPE_LABEL[d.type]}</span>
                    <span>{new Date(d.createdAt).toLocaleString('ko-KR')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {selectedDocument && (
            <div className={styles.docDetail}>
              <div className={styles.docDetailHeader}>
                <h3 className={styles.docTitle}>{selectedDocument.title}</h3>
                <button type="button" className={styles.smallBtn} onClick={handleCopyMarkdown}>
                  Markdown 복사
                </button>
              </div>
              {copyFeedback && <p className={styles.hintText}>{copyFeedback}</p>}

              {quality && (
                <div className={styles.qualityCard}>
                  <span className={styles.qualityScore}>품질 {quality.score}%</span>
                  {quality.missingSections.length > 0 && (
                    <span className={styles.hintText}>누락: {quality.missingSections.join(', ')}</span>
                  )}
                  {quality.traceabilityIncluded && (
                    <span className={styles.hintText}>추적성 커버리지 {quality.traceabilityCoverage}%</span>
                  )}
                </div>
              )}

              {sectionError && <p className={styles.errorText}>{sectionError}</p>}

              <div className={styles.sectionList}>
                {selectedDocument.sections.map((section) => (
                  <div key={`${section.id}:${section.content}`} className={styles.sectionBlock}>
                    <div className={styles.sectionBlockHeader}>
                      <span className={styles.sectionBlockTitle}>{section.title}</span>
                      <button
                        type="button"
                        className={styles.smallBtn}
                        disabled={sectionBusy === section.id}
                        onClick={() => handleRegenerateSection(section.id)}
                      >
                        {sectionBusy === section.id ? '재생성 중...' : '템플릿 재생성'}
                      </button>
                    </div>
                    <textarea
                      className={styles.sectionTextarea}
                      defaultValue={section.content}
                      onBlur={(e) => {
                        if (e.target.value !== section.content) {
                          handleSectionEdit(section.id, e.target.value);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
