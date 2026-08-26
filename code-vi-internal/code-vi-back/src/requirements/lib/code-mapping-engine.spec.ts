import {
  computeRequirementMapping,
  getMappingStatus,
  CodeCandidate,
} from './code-mapping-engine';

type Requirement = import('../entities/requirement.entity').Requirement;

function makeRequirement(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: 1,
    title: '사용자 로그인 기능',
    description: '이메일과 비밀번호로 로그인할 수 있어야 한다.',
    acceptanceCriteria: [],
    ...overrides,
  } as unknown as Requirement;
}

function makeCandidate(overrides: Partial<CodeCandidate> = {}): CodeCandidate {
  return {
    type: 'function',
    id: 1,
    name: 'login',
    path: 'src/auth/login.ts',
    ...overrides,
  };
}

describe('computeRequirementMapping', () => {
  it('매칭되는 코드 요소가 없으면 점수 0, matches 빈 배열을 반환한다', () => {
    const requirement = makeRequirement({
      title: '결제 화면 UI 개선',
      description: '',
    });
    const candidates = [makeCandidate({ name: 'renderDashboardChart' })];

    const result = computeRequirementMapping(requirement, candidates);

    expect(result.implementationScore).toBe(0);
    expect(result.matches).toEqual([]);
  });

  it('제목/설명과 겹치는 식별자가 있으면 매칭되고 점수가 0보다 크다', () => {
    // 토큰 오버랩 휴리스틱은 문자 그대로 비교하므로, 한글 문장과 영문 식별자가 매칭되려면
    // 요구사항 문구에 실제 영문 단어가 섞여 있어야 한다(실무 요구사항 문서에서 흔한 표기).
    const requirement = makeRequirement({
      title: '사용자 login 기능',
      description: 'login 처리를 담당한다.',
    });
    const candidates = [
      makeCandidate({ type: 'function', name: 'handleUserLogin' }),
      makeCandidate({ type: 'file', id: 2, name: 'unrelated.ts' }),
    ];

    const result = computeRequirementMapping(requirement, candidates);

    expect(result.implementationScore).toBeGreaterThan(0);
    expect(result.matches.some((m) => m.name === 'handleUserLogin')).toBe(true);
  });

  it('상위 5개까지만 matches에 담고 유사도 내림차순으로 정렬한다', () => {
    const requirement = makeRequirement({
      title: '사용자 로그인 기능',
      description: '',
    });
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({ id: i + 1, name: `userLoginHandler${i}` }),
    );

    const result = computeRequirementMapping(requirement, candidates);

    expect(result.matches.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.matches.length; i += 1) {
      expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(
        result.matches[i].score,
      );
    }
  });

  it('수용기준이 코드와 매칭되지 않으면 missingLogic에 포함된다', () => {
    const requirement = makeRequirement({
      title: '사용자 로그인 기능',
      description: '로그인 처리',
      acceptanceCriteria: ['비밀번호 재설정 이메일을 발송한다'],
    });
    const candidates = [makeCandidate({ name: 'handleLogin' })];

    const result = computeRequirementMapping(requirement, candidates);

    expect(result.missingLogic).toContain('비밀번호 재설정 이메일을 발송한다');
    expect(
      result.acceptanceCriteriaStatus.find(
        (s) => s.criterion === '비밀번호 재설정 이메일을 발송한다',
      )?.matched,
    ).toBe(false);
  });

  it('수용기준이 없으면 유사도 점수로 대체해 가중치를 왜곡하지 않는다', () => {
    const requirement = makeRequirement({
      title: '사용자 login 기능',
      description: 'login 처리를 담당한다',
      acceptanceCriteria: [],
    });
    const candidates = [makeCandidate({ name: 'handleUserLogin' })];

    const result = computeRequirementMapping(requirement, candidates);

    // similarityAvg > 0 이므로 acceptanceRate가 0으로 강제되지 않아 점수가 0보다 커야 한다.
    expect(result.implementationScore).toBeGreaterThan(0);
  });
});

describe('getMappingStatus', () => {
  it('점수 구간에 따라 상태를 분류한다', () => {
    expect(getMappingStatus(0)).toBe('unimplemented');
    expect(getMappingStatus(30)).toBe('partial');
    expect(getMappingStatus(60)).toBe('mostly');
    expect(getMappingStatus(90)).toBe('implemented');
  });
});
