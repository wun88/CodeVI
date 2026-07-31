import type { RequirementPriority, RequirementType } from '../interface/requirement.interface';

/**
 * ReqFlow(requirements-management-system) src/mocks/aiGeneration.ts를 이식 (jej_20 Phase 4).
 * 실제 LLM 호출이 아닌 고정 데모 출력이다 — CodeVi에도 아직 텍스트 생성용 LLM 연동이 없어
 * ReqFlow와 동일하게 규칙 기반(사실상 하드코딩) 결과를 유지한다. 화면에는 "AI 추정치"임을 명시한다.
 */
export interface AIGeneratedRequirement {
  tempId: string;
  title: string;
  description: string;
  type: RequirementType;
  priority: RequirementPriority;
  acceptanceCriteria: string[];
}

const DEMO_OUTPUT: AIGeneratedRequirement[] = [
  {
    tempId: 'AI-001',
    title: '사용자 로그인 기능',
    description: '사용자는 이메일과 비밀번호를 입력하여 시스템에 로그인할 수 있어야 한다.',
    type: 'functional',
    priority: 'high',
    acceptanceCriteria: [
      '이메일과 비밀번호 입력 필드 제공',
      '올바른 정보 입력 시 로그인 성공',
      '잘못된 정보 입력 시 오류 메시지 표시',
    ],
  },
  {
    tempId: 'AI-002',
    title: '개인 대시보드 조회 기능',
    description: '로그인한 사용자는 개인화된 대시보드에서 주요 정보를 확인할 수 있어야 한다.',
    type: 'functional',
    priority: 'high',
    acceptanceCriteria: [
      '로그인 후 대시보드 페이지로 이동',
      '사용자별 맞춤 위젯 표시',
      '최근 활동 요약 제공',
    ],
  },
  {
    tempId: 'AI-003',
    title: '응답 속도 3초 이내',
    description: '주요 화면 로딩은 3초 이내에 완료되어야 한다.',
    type: 'non_functional',
    priority: 'medium',
    acceptanceCriteria: ['P95 응답 시간 3초 이하', '초기 로딩 3초 이내'],
  },
];

/** input은 데모 출력에 실제로 반영되지 않는다 — 향후 실제 LLM 연동 시 사용할 자리만 유지 */
export async function generateRequirementsFromText(
  input: string,
): Promise<AIGeneratedRequirement[]> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return DEMO_OUTPUT;
}
