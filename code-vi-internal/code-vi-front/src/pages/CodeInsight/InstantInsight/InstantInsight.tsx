import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import '../CodeInsight.css';

type Lang = 'TypeScript' | 'JavaScript' | 'Python' | 'Java' | 'C++';

const mockResult = {
  qualityScore: 82,
  complexity: 'Medium',
  dependency: 'Low',
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightToHtml(code: string) {
  if (!code) return '';

  const escaped = escapeHtml(code);
  const tokenRe =
    /(\/\*[\s\S]*?\*\/|\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:class|constructor|private|async|const|return|if|throw|new|interface|type)\b|\b\d+(?:\.\d+)?\b|\b[A-Z][A-Za-z0-9_]*\b|\b[a-zA-Z_]\w*(?=\s*\())/gm;

  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(escaped))) {
    const start = m.index;
    const tok = m[0];
    out += escaped.slice(last, start);

    let cls = 'tokDefault';
    if (tok.startsWith('//') || tok.startsWith('/*')) cls = 'tokComment';
    else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('`')) cls = 'tokString';
    else if (/^\b\d/.test(tok)) cls = 'tokNumber';
    else if (/^(class|constructor|private|async|const|return|if|throw|new|interface|type)$/.test(tok))
      cls = 'tokKeyword';
    else if (/^[A-Z]/.test(tok)) cls = 'tokType';
    else cls = 'tokFunction';

    out += `<span class="${cls}">${tok}</span>`;
    last = start + tok.length;
  }

  out += escaped.slice(last);
  // keep last empty line height stable
  if (!out.endsWith('\n')) out += '\n';
  return out;
}

export default function InstantInsight() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>('TypeScript');
  const [snippet, setSnippet] = useState('');
  const [hasResult, setHasResult] = useState(false);
  const canAnalyze = snippet.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);

  const snippetStats = useMemo(() => {
    const lines = snippet.length ? snippet.split('\n').length : 0;
    const chars = snippet.length;
    return { lines, chars };
  }, [snippet]);

  const highlightHtml = useMemo(() => {
    const placeholder = `// Paste your ${lang} snippet here...\n\nfunction example() {\n  return true;\n}\n`;
    const raw = snippet.length ? snippet : placeholder;
    return highlightToHtml(raw);
  }, [lang, snippet]);

  const onAnalyze = () => {
    // TODO: connect real Instant Insight API here.
    setHasResult(true);
  };

  const syncScroll = () => {
    const ta = textareaRef.current;
    const pre = highlightRef.current;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  };

  return (
    <div className="code-insight-page">
      <Header variant="internal" />
      <main className="code-insight-content instant-shell">
        <button className="back-btn" onClick={() => navigate('/code-insight')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          돌아가기
        </button>

        <div className="code-insight-header header-left">
          <h1>Instant Insight</h1>
          <p>코드 스니펫을 붙여넣고 즉시 구조/품질 미리보기를 확인합니다.</p>
        </div>

        <section className={['instantSurface', canAnalyze ? 'isHot' : '', hasResult ? 'hasResult' : ''].join(' ')}>
          <div className="instantSurfaceInner">
            <div className="surfaceHeader" aria-hidden>
              <div className="surfaceKicker">REALTIME ANALYSIS WORKSPACE</div>
              <div className="surfaceStatus">
                <span className="statusDot" />
                <span className="statusText">{hasResult ? 'ANALYZED' : canAnalyze ? 'READY' : 'IDLE'}</span>
              </div>
            </div>

            <div className="instant-grid">
              <div className="instant-card">
            <div className="instant-card-head">
              <div className="instant-label">SNIPPET</div>
              <div className="instant-meta">
                {snippetStats.lines} lines · {snippetStats.chars.toLocaleString()} chars
              </div>
            </div>

            <div className="instant-controls">
              <label className="instant-field">
                <span>언어</span>
                <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  <option>TypeScript</option>
                  <option>JavaScript</option>
                  <option>Python</option>
                  <option>Java</option>
                  <option>C++</option>
                </select>
              </label>

              <button className="instant-cta" type="button" onClick={onAnalyze} disabled={!canAnalyze}>
                <span className="ctaDot" aria-hidden />
                <span className="ctaText">Analyze</span>
                <span className="ctaArrow" aria-hidden>
                  →
                </span>
                <span className="ctaSweep" aria-hidden />
              </button>
            </div>

            <div className={['editorShell', canAnalyze ? 'isActive' : '', hasResult ? 'hasResult' : ''].join(' ')}>
              <div className="editorTopbar" aria-hidden>
                <div className="editorDots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="editorTitle">Instant Analyzer</div>
                <div className="editorStatus">
                  <span className="statusDot" />
                  <span className="statusText">{hasResult ? 'ANALYZED' : canAnalyze ? 'READY' : 'IDLE'}</span>
                </div>
              </div>
              <div className={['editorBody', snippet.length ? '' : 'isPlaceholder'].join(' ')}>
                <pre
                  ref={highlightRef}
                  className="highlightLayer"
                  aria-hidden
                  dangerouslySetInnerHTML={{ __html: highlightHtml }}
                />
                <textarea
                  ref={textareaRef}
                  className="instant-textarea"
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  onScroll={syncScroll}
                  placeholder=""
                  spellCheck={false}
                />
              </div>
            </div>
              </div>

              <div className="instant-card">
            <div className="instant-card-head">
              <div className="instant-label">PREVIEW</div>
              <div className="instant-meta">{hasResult ? 'Mock result' : 'Waiting for input'}</div>
            </div>

            <div className="instant-preview">
              <div className="preview-block">
                <div className="preview-title">Structure Diagram</div>
                <div className={['preview-box', hasResult ? 'hasResult' : 'isIdle'].join(' ')}>
                  <div className="diagramMesh" aria-hidden />
                  <div className="diagramScan" aria-hidden />
                  <div className="diagramNodes" aria-hidden>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="diagramCaption">
                    {hasResult
                      ? 'Structure preview'
                      : canAnalyze
                        ? 'Awaiting analysis — run Analyze'
                        : 'Structure preview will appear here'}
                  </div>
                </div>
              </div>
              <div className="preview-row">
                <div className="preview-stat">
                  <div className="preview-title">Quality Score</div>
                  <div className={['preview-val', hasResult ? '' : 'skeleton'].join(' ')}>
                    {hasResult ? mockResult.qualityScore : '—'}
                  </div>
                  <div className={['miniSpark', hasResult ? '' : 'isIdle'].join(' ')} aria-hidden />
                </div>
                <div className="preview-stat">
                  <div className="preview-title">Complexity</div>
                  <div className={['preview-val', hasResult ? '' : 'skeleton'].join(' ')}>
                    {hasResult ? mockResult.complexity : '—'}
                  </div>
                  <div className={['miniSpark', hasResult ? '' : 'isIdle'].join(' ')} aria-hidden />
                </div>
                <div className="preview-stat">
                  <div className="preview-title">Dependency</div>
                  <div className={['preview-val', hasResult ? '' : 'skeleton'].join(' ')}>
                    {hasResult ? mockResult.dependency : '—'}
                  </div>
                  <div className={['miniSpark', hasResult ? '' : 'isIdle'].join(' ')} aria-hidden />
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

