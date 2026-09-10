import type { CodeMatchDetail } from '../../interface/relationshipGraph.interface';
import type { Requirement } from '../../interface/requirement.interface';
import {
  CONNECTION_COLORS,
  CONNECTION_MIN_SCORE,
  getConnectionColor,
  getConnectionDashArray,
  getConnectionStrength,
  getConnectionStrokeWidth,
} from '../../utils/relationshipGraph';
import styles from './RelationshipGraph.module.css';

/* SVG 좌표계 상수 — 폭 700 고정, 높이는 내용에 맞춰 계산한다. */
const VIEW_WIDTH = 700;
const MIN_VIEW_HEIGHT = 170;
const VIEW_PADDING_Y = 24;

/* 요구사항 노드 — 폭은 고정, 높이는 제목 줄 수에 따라 늘어난다(제목을 자르지 않는다). */
const REQ_X = 130;
const REQ_W = 200;
const REQ_MIN_H = 76;
const REQ_PAD_Y = 14;
/** 제목 폰트 크기 — CSS(.reqTitle)와 같아야 폭 계산이 맞는다. */
const REQ_TITLE_FONT = 11;
const REQ_ID_H = 14;
const REQ_TITLE_LINE_H = 14;
const REQ_META_H = 13;
const REQ_ROW_GAP = 5;

/* 코드 파일 노드 */
const FILE_X = 380;
const FILE_W = 280;
const FILE_H = 48;
const FILE_TOP = 40;
const FILE_GAP = 72;

/* 파일 노드 아래 함수 서브노드 — 파일 노드(48)와 다음 노드(72) 사이 24px 띠 안에 들어가야 한다. */
const FN_X = FILE_X + 20;
const FN_TOP_OFFSET = 56;
const FN_GAP = 11;
const MAX_FUNCTIONS = 2;

/**
 * SVG는 텍스트를 감싸주지 않으므로 폭을 직접 어림한다.
 * 한글·한자·가나는 전각(≈1em), 그 외는 반각(≈0.55em)으로 계산한다 — 글자 수로만 자르면
 * 한글 제목이 노드 박스를 그대로 넘친다.
 * @param text 대상 문자열
 * @param fontSize 렌더링 폰트 크기(px)
 */
function measureWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    units += /[\u1100-\u11ff\u3000-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uff60]/.test(char)
      ? 1
      : 0.55;
  }
  return units * fontSize;
}

/**
 * 주어진 폭을 넘지 않도록 잘라내고 말줄임표를 붙인다. 파일명·경로처럼 툴팁으로 전문을
 * 볼 수 있는 보조 정보에만 쓴다.
 * @param text 원본 문자열
 * @param maxWidth 허용 폭(px)
 * @param fontSize 렌더링 폰트 크기(px)
 */
function truncateToWidth(text: string, maxWidth: number, fontSize: number): string {
  if (measureWidth(text, fontSize) <= maxWidth) return text;
  const chars = [...text];
  let result = '';
  for (const char of chars) {
    if (measureWidth(`${result}${char}…`, fontSize) > maxWidth) break;
    result += char;
  }
  return `${result}…`;
}

/**
 * 한 단어가 한 줄보다 길 때만 글자 단위로 쪼갠다.
 * @param word 대상 단어
 * @param maxWidth 한 줄 허용 폭(px)
 * @param fontSize 렌더링 폰트 크기(px)
 */
function splitLongWord(word: string, maxWidth: number, fontSize: number): string[] {
  const parts: string[] = [];
  let current = '';
  for (const char of word) {
    if (current !== '' && measureWidth(current + char, fontSize) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current !== '') parts.push(current);
  return parts;
}

/**
 * 폭에 맞춰 여러 줄로 접는다. **잘라내지 않는다** — 줄 수는 내용에 따라 늘어나고,
 * 노드 높이가 그에 맞춰 커진다. 어절(공백) 단위로 끊어 '등급'이 '등/급'으로 갈라지지 않게 한다.
 * @param text 원본 문자열
 * @param maxWidth 한 줄 허용 폭(px)
 * @param fontSize 렌더링 폰트 크기(px)
 */
function wrapToLines(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  let line = '';

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line === '' ? word : `${line} ${word}`;
    if (measureWidth(candidate, fontSize) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line !== '') {
      lines.push(line);
      line = '';
    }
    // 어절 하나가 한 줄보다 길면 그 어절만 글자 단위로 쪼갠다.
    if (measureWidth(word, fontSize) > maxWidth) {
      const parts = splitLongWord(word, maxWidth, fontSize);
      lines.push(...parts.slice(0, -1));
      line = parts[parts.length - 1] ?? '';
    } else {
      line = word;
    }
  }
  if (line !== '') lines.push(line);

  return lines.length > 0 ? lines : [''];
}

/**
 * 0~1 유사도를 정수 퍼센트 문자열로 만든다.
 * @param score 0~1 정규화 유사도
 */
function toPercent(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

const LEGEND = [
  { key: 'strong', label: '강함', range: '85% 이상' },
  { key: 'medium', label: '보통', range: '70~85%' },
  { key: 'weak', label: '약함', range: '40~70%' },
  { key: 'hidden', label: '숨김', range: '40% 미만' },
] as const;

interface RelationshipGraphProps {
  requirement: Requirement;
  matches: CodeMatchDetail[];
  /** 선택된 코드 파일의 codeFileId(=경로). 미선택이면 null. */
  selectedFile: string | null;
  onSelectFile: (codeFileId: string) => void;
}

/**
 * 요구사항 1건을 중심 노드로 두고 연관 코드 파일을 유사도 기반으로 잇는 노드-링크 그래프.
 * 외부 차트 라이브러리 없이 순수 SVG로 그린다.
 */
export default function RelationshipGraph({
  requirement,
  matches,
  selectedFile,
  onSelectFile,
}: RelationshipGraphProps) {
  // 임계값 미만(hidden)은 노이즈이므로 아예 그리지 않는다.
  const visible = matches.filter((match) => match.score >= CONNECTION_MIN_SCORE);
  const hiddenCount = matches.length - visible.length;

  // 제목은 자르지 않는다 — 폭에 맞춰 접고 노드 높이를 그만큼 키운다.
  const titleLines = wrapToLines(requirement.title, REQ_W - 24, REQ_TITLE_FONT);
  const reqContentH =
    REQ_ID_H +
    REQ_ROW_GAP +
    titleLines.length * REQ_TITLE_LINE_H +
    REQ_ROW_GAP +
    REQ_META_H;
  const reqH = Math.max(REQ_MIN_H, reqContentH + REQ_PAD_Y * 2);

  // 노드가 3개인데 캔버스만 5개분이면 아래가 빈 채로 남는다 — 내용 높이에 맞춘다.
  const lastIndex = Math.max(visible.length - 1, 0);
  const lastFnRows = Math.min(visible[lastIndex]?.functions.length ?? 0, MAX_FUNCTIONS);
  const contentBottom =
    FILE_TOP +
    lastIndex * FILE_GAP +
    (lastFnRows > 0 ? FN_TOP_OFFSET + (lastFnRows - 1) * FN_GAP + 6 : FILE_H);
  const viewHeight = Math.max(
    contentBottom + VIEW_PADDING_Y,
    reqH + VIEW_PADDING_Y * 2,
    MIN_VIEW_HEIGHT,
  );
  const reqY = viewHeight / 2;
  /** 연결선이 요구사항 노드에서 빠져나오는 지점(우측 변 중앙) */
  const reqAnchorX = REQ_X + REQ_W / 2;
  const reqContentTop = -reqH / 2 + REQ_PAD_Y;

  if (visible.length === 0) {
    return (
      <p className={styles.empty}>
        유사도 {toPercent(CONNECTION_MIN_SCORE)} 이상으로 연결된 코드 파일이 없습니다.
        {hiddenCount > 0 && ` (임계값 미만 ${hiddenCount}건 숨김)`}
      </p>
    );
  }

  return (
    <div className={styles.wrapper}>
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
        role="img"
        aria-label={`요구사항 ${requirement.title}과(와) 연관된 코드 파일 ${visible.length}건의 관계 그래프`}
      >
        {/* 연결선은 노드보다 먼저 그려 노드 뒤로 깔리게 한다. */}
        {visible.map((match, index) => {
          const centerY = FILE_TOP + index * FILE_GAP + FILE_H / 2;
          const strength = getConnectionStrength(match.score);
          const color = getConnectionColor(match.score);
          const labelX = (reqAnchorX + FILE_X) / 2;
          const labelY = (reqY + centerY) / 2;
          const dimmed = selectedFile !== null && selectedFile !== match.codeFileId;

          return (
            <g key={`edge-${match.codeFileId}`} opacity={dimmed ? 0.3 : 1}>
              <line
                x1={reqAnchorX}
                y1={reqY}
                x2={FILE_X}
                y2={centerY}
                stroke={color}
                strokeWidth={getConnectionStrokeWidth(strength)}
                strokeDasharray={getConnectionDashArray(strength)}
                strokeLinecap="round"
              />
              {/* 선 위에 라벨을 얹으면 읽기 어려워 배경 알약을 깔아준다. */}
              <rect
                className={styles.edgeLabelBg}
                x={labelX - 19}
                y={labelY - 9}
                width={38}
                height={18}
                rx={9}
              />
              <text
                className={styles.edgeLabel}
                x={labelX}
                y={labelY}
                fill={color}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {toPercent(match.score)}
              </text>
            </g>
          );
        })}

        {/* 요구사항 노드 — 중심 기준 좌표라 rect를 절반씩 음수로 민다. */}
        <g transform={`translate(${REQ_X}, ${reqY})`}>
          <rect
            className={styles.reqNode}
            x={-REQ_W / 2}
            y={-reqH / 2}
            width={REQ_W}
            height={reqH}
            rx={12}
          />
          <text
            className={styles.reqId}
            x={0}
            y={reqContentTop + REQ_ID_H / 2}
            textAnchor="middle"
            dominantBaseline="central"
          >
            REQ-{requirement.id}
          </text>
          {titleLines.map((line, lineIndex) => (
            <text
              key={`req-title-${lineIndex}`}
              className={styles.reqTitle}
              x={0}
              y={
                reqContentTop +
                REQ_ID_H +
                REQ_ROW_GAP +
                lineIndex * REQ_TITLE_LINE_H +
                REQ_TITLE_LINE_H / 2
              }
              textAnchor="middle"
              dominantBaseline="central"
            >
              {line}
            </text>
          ))}
          <text
            className={styles.reqMeta}
            x={0}
            y={
              reqContentTop +
              REQ_ID_H +
              REQ_ROW_GAP * 2 +
              titleLines.length * REQ_TITLE_LINE_H +
              REQ_META_H / 2
            }
            textAnchor="middle"
            dominantBaseline="central"
          >
            연관 {visible.length}건
          </text>
        </g>

        {/* 코드 파일 노드 + 함수 서브노드 */}
        {visible.map((match, index) => {
          const nodeY = FILE_TOP + index * FILE_GAP;
          const selected = selectedFile === match.codeFileId;
          const dimmed = selectedFile !== null && !selected;

          return (
            <g key={`node-${match.codeFileId}`} opacity={dimmed ? 0.45 : 1}>
              <g
                className={styles.fileGroup}
                transform={`translate(${FILE_X}, ${nodeY})`}
                onClick={() => onSelectFile(match.codeFileId)}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectFile(match.codeFileId);
                  }
                }}
              >
                <rect
                  className={`${styles.fileNode} ${selected ? styles.fileNodeSelected : ''}`}
                  x={0}
                  y={0}
                  width={FILE_W}
                  height={FILE_H}
                  rx={10}
                />
                {/* 좌측 세로 바로 유사도 등급을 한 번 더 인코딩한다. */}
                <rect
                  x={0}
                  y={0}
                  width={3}
                  height={FILE_H}
                  rx={1.5}
                  fill={getConnectionColor(match.score)}
                />
                <text className={styles.fileName} x={14} y={19}>
                  {truncateToWidth(match.displayName, FILE_W - 70, 12)}
                </text>
                <text className={styles.filePath} x={14} y={35}>
                  {truncateToWidth(match.path, FILE_W - 70, 10)}
                </text>
                <text
                  className={styles.fileScore}
                  x={FILE_W - 12}
                  y={26}
                  textAnchor="end"
                  fill={getConnectionColor(match.score)}
                >
                  {toPercent(match.score)}
                </text>
                <title>{`${match.path} — 유사도 ${toPercent(match.score)}`}</title>
              </g>

              {match.functions.slice(0, MAX_FUNCTIONS).map((fn, fnIndex) => (
                <g
                  key={`fn-${match.codeFileId}-${fn.name}`}
                  transform={`translate(${FN_X}, ${nodeY + FN_TOP_OFFSET + fnIndex * FN_GAP})`}
                >
                  <circle cx={0} cy={0} r={2.5} fill={getConnectionColor(fn.score)} />
                  <text className={styles.fnLabel} x={9} y={0} dominantBaseline="central">
                    {truncateToWidth(fn.name, FILE_W - 90, 9)} ({toPercent(fn.score)})
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>

      <ul className={styles.legend}>
        {LEGEND.map((item) => (
          <li key={item.key} className={styles.legendItem}>
            <span
              className={`${styles.legendSwatch} ${
                item.key === 'weak' ? styles.legendSwatchDashed : ''
              }`}
              style={
                item.key === 'weak'
                  ? {
                      backgroundImage: `repeating-linear-gradient(90deg, ${CONNECTION_COLORS.weak} 0 4px, transparent 4px 8px)`,
                    }
                  : { background: CONNECTION_COLORS[item.key] }
              }
              aria-hidden
            />
            <span className={styles.legendLabel}>
              {item.label} · {item.range}
            </span>
            {item.key === 'hidden' && hiddenCount > 0 && (
              <span className={styles.legendValue}>{hiddenCount}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
