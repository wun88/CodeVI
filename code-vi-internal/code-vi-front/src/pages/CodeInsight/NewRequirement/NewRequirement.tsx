import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../../components/Header';
import { requirementsService } from '../../../services/requirementsService';
import { teamProjectService } from '../../../services/teamProjectService';
import { generateRequirementsFromText, type AIGeneratedRequirement } from '../../../utils/aiRequirementDemo';
import { parseCsv, csvRowsToRequirements, type ParsedRequirementRow } from '../../../utils/requirementCsv';
import type { RequirementPriority, RequirementType } from '../../../interface/requirement.interface';
import '../CodeInsight.css';
import styles from './NewRequirement.module.css';

export default function NewRequirement() {
  const navigate = useNavigate();
  const { teamProjectId } = useParams<{ teamProjectId: string }>();
  const projectId = Number(teamProjectId);
  // 라우터 state 대신 API로 조회한다 — /projects/:id에서 이동했거나 새로고침해도 이름이 유지되도록 (jej_21 Phase 2)
  const [teamName, setTeamName] = useState<string | undefined>();

  useEffect(() => {
    teamProjectService
      .getProjectDetail(projectId)
      .then((project) => setTeamName(project.teamName))
      .catch(() => setTeamName(undefined));
  }, [projectId]);

  // 직접 등록
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequirementType>('functional');
  const [priority, setPriority] = useState<RequirementPriority>('medium');
  const [ownerName, setOwnerName] = useState('');
  const [criteria, setCriteria] = useState('');
  const [directSaving, setDirectSaving] = useState(false);
  const [directError, setDirectError] = useState('');

  // AI 자연어 생성
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AIGeneratedRequirement[]>([]);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV 가져오기
  const [csvRows, setCsvRows] = useState<ParsedRequirementRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvSubmitError, setCsvSubmitError] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [savedMessage, setSavedMessage] = useState('');

  // 저장 후 프로젝트 목록이 아니라 방금 추가한 요구사항이 보이는 상세 화면으로 돌아간다 (jej_21 Phase 2)
  const goToProjectDetail = () => {
    setTimeout(() => navigate(`/dashboard/${projectId}`), 800);
  };

  const handleDirectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setDirectError('제목을 입력하세요.');
      return;
    }
    setDirectError('');
    setDirectSaving(true);
    try {
      await requirementsService.create({
        teamProjectId: projectId,
        title,
        description,
        type,
        priority,
        ownerName: ownerName.trim() || undefined,
        acceptanceCriteria: criteria.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      setSavedMessage('요구사항이 등록되었습니다.');
      goToProjectDetail();
    } catch {
      setDirectError('요구사항 등록에 실패했습니다.');
    } finally {
      setDirectSaving(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const results = await generateRequirementsFromText(aiInput);
      setAiResults(results);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAIResults = async () => {
    setAiError('');
    setAiSaving(true);
    try {
      const result = await requirementsService.createBulk(
        projectId,
        aiResults.map((ai) => ({
          title: ai.title,
          description: ai.description,
          type: ai.type,
          priority: ai.priority,
          acceptanceCriteria: ai.acceptanceCriteria,
          source: 'AI 생성',
          tags: ['ai-generated'],
        })),
      );
      if (result.failureCount > 0) {
        setAiError(`등록에 실패했습니다: ${result.errors.join(', ')}`);
        return;
      }
      setSavedMessage(`${result.successCount}개 요구사항이 등록되었습니다.`);
      goToProjectDetail();
    } catch {
      setAiError('AI 요구사항 등록에 실패했습니다.');
    } finally {
      setAiSaving(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setAiInput(text.trim());
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCsvErrors([]);
    setCsvRows([]);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const rows = parseCsv(text);
      const { requirements: parsed, errors } = csvRowsToRequirements(rows);
      setCsvRows(parsed);
      setCsvErrors(errors);
      setCsvFileName(file.name);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return;
    setCsvSubmitError('');
    setCsvImporting(true);
    try {
      const result = await requirementsService.createBulk(
        projectId,
        csvRows.map((row) => ({
          title: row.title,
          description: row.description,
          type: row.type,
          priority: row.priority,
          ownerName: row.ownerName || undefined,
          acceptanceCriteria: row.acceptanceCriteria,
          tags: row.tags,
          source: row.source,
          relatedFeature: row.relatedFeature,
        })),
      );
      if (result.failureCount > 0) {
        setCsvSubmitError(`가져오기에 실패했습니다: ${result.errors.join(', ')}`);
        return;
      }
      setSavedMessage(`CSV에서 ${result.successCount}개 요구사항을 가져왔습니다.`);
      goToProjectDetail();
    } catch {
      setCsvSubmitError('CSV 가져오기에 실패했습니다.');
    } finally {
      setCsvImporting(false);
    }
  };

  return (
    <div className="code-insight-page">
      <Header variant="internal" />
      <main className="code-insight-content project-shell">
        <button className="back-btn" onClick={() => navigate('/projects')} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          내 프로젝트로
        </button>

        <div className="code-insight-header header-left">
          <h1>{teamName ?? '요구사항 입력'}</h1>
          <p>자연어 입력, 직접 등록, CSV 가져오기 중 편한 방식으로 요구사항을 등록하세요.</p>
        </div>

        {savedMessage && <p className={styles.savedMessage}>{savedMessage}</p>}

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>직접 등록</h2>
            <form className={styles.form} onSubmit={handleDirectSave}>
              <label className={styles.label}>
                제목 *
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 로그인 기능"
                />
              </label>
              <label className={styles.label}>
                설명
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="요구사항 상세 설명"
                />
              </label>
              <div className={styles.row2}>
                <label className={styles.label}>
                  유형
                  <select
                    className={styles.select}
                    value={type}
                    onChange={(e) => setType(e.target.value as RequirementType)}
                  >
                    <option value="functional">기능</option>
                    <option value="non_functional">비기능</option>
                  </select>
                </label>
                <label className={styles.label}>
                  우선순위
                  <select
                    className={styles.select}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as RequirementPriority)}
                  >
                    <option value="critical">치명</option>
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </label>
              </div>
              <label className={styles.label}>
                담당자
                <input
                  className={styles.input}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="이름 입력 — 회원이 아니어도 됩니다"
                  maxLength={100}
                />
              </label>
              <label className={styles.label}>
                수용 기준
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="한 줄에 하나씩 입력"
                />
              </label>
              {directError && <p className={styles.error}>{directError}</p>}
              <button type="submit" className={styles.submitBtn} disabled={directSaving}>
                {directSaving ? '등록 중...' : '요구사항 등록'}
              </button>
            </form>
          </section>

          <div className={styles.column}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>AI 요구사항 생성</h2>
              <p className={styles.cardDesc}>
                회의록이나 아이디어를 입력하면 AI 추정치로 요구사항 초안을 생성합니다.
              </p>
              <textarea
                className={styles.textarea}
                rows={4}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="자연어로 요구사항을 설명하세요..."
              />
              <div className={styles.btnRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className={styles.hiddenInput}
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  업로드
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleAIGenerate}
                  disabled={aiLoading || !aiInput.trim()}
                >
                  {aiLoading ? '생성 중...' : 'AI 요구사항 생성'}
                </button>
              </div>

              {aiResults.length > 0 && (
                <div className={styles.aiResults}>
                  {aiResults.map((item) => (
                    <div key={item.tempId} className={styles.aiResultItem}>
                      <p className={styles.aiResultTitle}>{item.title}</p>
                      <p className={styles.cardDesc}>{item.description}</p>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={handleSaveAIResults}
                    disabled={aiSaving}
                  >
                    {aiSaving ? '등록 중...' : `${aiResults.length}개 요구사항 등록`}
                  </button>
                </div>
              )}
              {aiError && <p className={styles.error}>{aiError}</p>}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>CSV 가져오기</h2>
              <p className={styles.cardDesc}>title 컬럼이 포함된 CSV로 여러 요구사항을 한 번에 등록합니다.</p>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className={styles.hiddenInput}
                onChange={handleCsvFileSelected}
              />
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => csvInputRef.current?.click()}
                >
                  CSV 파일 선택
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleCsvImport}
                  disabled={csvRows.length === 0 || csvImporting}
                >
                  {csvImporting ? '가져오는 중...' : csvRows.length > 0 ? `${csvRows.length}개 가져오기` : '가져오기'}
                </button>
              </div>
              {csvFileName && <p className={styles.cardDesc}>선택된 파일: {csvFileName}</p>}
              {csvErrors.map((err, i) => (
                <p key={i} className={styles.error}>
                  {err}
                </p>
              ))}
              {csvSubmitError && <p className={styles.error}>{csvSubmitError}</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
