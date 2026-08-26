import type { RequirementPriority, RequirementType } from '../interface/requirement.interface';

/**
 * ReqFlow(requirements-management-system) src/utils/csv.ts의 parseCsv/csvRowsToRequirements를
 * 이식(내보내기 기능은 제외, 가져오기만 필요) (jej_20 Phase 4).
 * Minimal RFC-4180-ish CSV 파서: quoted 필드, escaped quote, 임베디드 줄바꿈을 처리한다.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // UTF-8 BOM(U+FEFF) 제거 — 정규식 리터럴에 유니코드 공백 문자를 직접 쓰지 않기 위해 charCodeAt로 검사
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip, \n이 줄바꿈을 처리
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export interface ParsedRequirementRow {
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  ownerName: string;
  dueDate: string;
  acceptanceCriteria: string[];
  tags: string[];
  source: string;
  relatedFeature: string;
}

const VALID_TYPES: RequirementType[] = ['functional', 'non_functional'];
const VALID_PRIORITIES: RequirementPriority[] = ['critical', 'high', 'medium', 'low'];

/** 헤더 이름(대소문자 무시)으로 컬럼을 매칭한다 — title 컬럼만 필수. */
export function csvRowsToRequirements(rows: string[][]): {
  requirements: ParsedRequirementRow[];
  errors: string[];
} {
  if (rows.length === 0) return { requirements: [], errors: ['빈 파일입니다.'] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf('title');
  if (titleIdx === -1) {
    return { requirements: [], errors: ['title 컬럼을 찾을 수 없습니다.'] };
  }

  const colIndex = (name: string) => header.indexOf(name);
  const descIdx = colIndex('description');
  const typeIdx = colIndex('type');
  const priorityIdx = colIndex('priority');
  // 담당자는 회원과 무관한 자유 문자열 — 영문(owner/ownername)과 한글(담당자) 헤더 모두 허용
  const ownerIdx = [colIndex('owner'), colIndex('ownername'), colIndex('담당자')].find((i) => i >= 0) ?? -1;
  const dueDateIdx = colIndex('duedate');
  const criteriaIdx = colIndex('acceptancecriteria');
  const tagsIdx = colIndex('tags');
  const sourceIdx = colIndex('source');
  const featureIdx = colIndex('relatedfeature');

  const requirements: ParsedRequirementRow[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((cells, rowIdx) => {
    const title = (cells[titleIdx] ?? '').trim();
    if (!title) {
      errors.push(`${rowIdx + 2}행: title이 비어 있어 건너뜁니다.`);
      return;
    }

    const rawType = (typeIdx >= 0 ? cells[typeIdx] : '')?.trim() as RequirementType;
    const rawPriority = (priorityIdx >= 0 ? cells[priorityIdx] : '')?.trim() as RequirementPriority;

    requirements.push({
      title,
      description: descIdx >= 0 ? (cells[descIdx] ?? '') : '',
      type: VALID_TYPES.includes(rawType) ? rawType : 'functional',
      priority: VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'medium',
      ownerName: ownerIdx >= 0 ? (cells[ownerIdx] ?? '').trim() : '',
      dueDate: dueDateIdx >= 0 ? (cells[dueDateIdx] ?? '') : '',
      acceptanceCriteria:
        criteriaIdx >= 0
          ? (cells[criteriaIdx] ?? '').split(';').map((s) => s.trim()).filter(Boolean)
          : [],
      tags: tagsIdx >= 0 ? (cells[tagsIdx] ?? '').split(';').map((s) => s.trim()).filter(Boolean) : [],
      source: sourceIdx >= 0 ? (cells[sourceIdx] ?? '') : 'CSV 가져오기',
      relatedFeature: featureIdx >= 0 ? (cells[featureIdx] ?? '') : '',
    });
  });

  return { requirements, errors };
}
