import { SetMetadata } from '@nestjs/common';

export const PROJECT_MEMBER_KEY = 'projectMember';

export interface ProjectMemberOptions {
  /** teamProjectId 값이 실려 있는 request 위치 */
  source: 'params' | 'query' | 'body';
  /** 그 위치 안에서의 필드명 (예: 'teamProjectId', 'id') */
  field: string;
  /**
   * true면 값이 비어 있을 때 검증을 건너뛴다 — GitHub 코드 연결(github-connect)처럼
   * teamProjectId가 선택값(신규 프로젝트 생성 시엔 없음)인 라우트에서 사용한다.
   */
  optional?: boolean;
}

/**
 * 요청 사용자가 지정된 teamProjectId의 멤버인지 `ProjectMemberGuard`가 검증하도록 표시한다.
 * `RolesGuard`/`@Roles()`(roles.decorator.ts)와 동일한 SetMetadata + Guard 관례 —
 * requirements.service.ts의 assertMembership, team-project.service.ts의 getProjectDetail,
 * github-connect.service.ts의 registerProject에 각각 중복돼 있던 인가 로직을 통합한다.
 */
export const ProjectMember = (options: ProjectMemberOptions) =>
  SetMetadata(PROJECT_MEMBER_KEY, options);
