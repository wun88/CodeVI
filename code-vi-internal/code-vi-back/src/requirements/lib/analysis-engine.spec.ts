import {
  buildAnalysisFindings,
  sortFindingsBySeverity,
} from './analysis-engine';
import { AnalysisFindingType } from '../entities/analysis-finding-type.enum';
import { AnalysisSeverity } from '../entities/analysis-severity.enum';

type Requirement = import('../entities/requirement.entity').Requirement;

function makeRequirement(
  id: number,
  title: string,
  description = '',
): Requirement {
  return {
    id,
    title,
    description,
    acceptanceCriteria: [],
  } as unknown as Requirement;
}

describe('buildAnalysisFindings', () => {
  it('OMISSION 타입 finding을 생성하지 않는다 (PR #61 리뷰 #13 — 하드코딩된 인증 키워드 오탐 제거)', () => {
    const requirements = [
      makeRequirement(1, '결제 화면 UI 개선'),
      makeRequirement(2, '주문 내역 조회 API'),
    ];

    const findings = buildAnalysisFindings(1, requirements);

    expect(findings.some((f) => f.type === AnalysisFindingType.OMISSION)).toBe(
      false,
    );
  });

  it('제목/설명이 거의 같은 요구사항 쌍은 여전히 DUPLICATE finding을 생성한다', () => {
    const requirements = [
      makeRequirement(
        1,
        '사용자 로그인 기능 구현',
        '이메일과 비밀번호로 로그인',
      ),
      makeRequirement(
        2,
        '사용자 로그인 기능 구현',
        '이메일과 비밀번호로 로그인',
      ),
    ];

    const findings = buildAnalysisFindings(1, requirements);

    expect(findings.some((f) => f.type === AnalysisFindingType.DUPLICATE)).toBe(
      true,
    );
  });
});

describe('sortFindingsBySeverity (PR #61 리뷰 #18)', () => {
  it('severity(critical→low) 우선, 동률이면 confidence 내림차순으로 정렬한다', () => {
    const findings = [
      { severity: AnalysisSeverity.LOW, confidence: 0.9 },
      { severity: AnalysisSeverity.CRITICAL, confidence: 0.5 },
      { severity: AnalysisSeverity.HIGH, confidence: 0.6 },
      { severity: AnalysisSeverity.HIGH, confidence: 0.95 },
    ];

    const sorted = sortFindingsBySeverity(findings);

    expect(sorted.map((f) => [f.severity, f.confidence])).toEqual([
      [AnalysisSeverity.CRITICAL, 0.5],
      [AnalysisSeverity.HIGH, 0.95],
      [AnalysisSeverity.HIGH, 0.6],
      [AnalysisSeverity.LOW, 0.9],
    ]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const findings = [
      { severity: AnalysisSeverity.LOW, confidence: 0.1 },
      { severity: AnalysisSeverity.HIGH, confidence: 0.2 },
    ];
    const original = [...findings];

    sortFindingsBySeverity(findings);

    expect(findings).toEqual(original);
  });
});
