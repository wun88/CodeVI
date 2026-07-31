import { TeamProjectResponseDto } from './team-project-response.dto';

type TeamProject = import('../entities/team-project.entity').TeamProject;

/** "내 프로젝트" 카드 배지 계산 단위 테스트 (jej_20 Phase 3) */
describe('TeamProjectResponseDto — 상태 배지', () => {
  const baseProject = {
    id: 1,
    teamName: '테스트 프로젝트',
    JenkinsJobName: null,
    users: [{ username: 'jej031020' }],
  } as unknown as TeamProject;

  it('코드 분석 결과가 있으면 "코드 분석 완료 · N점"으로 표시한다', () => {
    const project = {
      ...baseProject,
      latestAnalysis: {
        buildNumber: 3,
        status: 'success',
        bugs: 1,
        vulnerabilities: 0,
        security_hotspots: 0,
        code_smells: 2,
        complexity: 10,
        cognitive_complexity: 5,
        ncloc: 500,
        createdAt: new Date('2026-07-01'),
      },
    } as unknown as TeamProject;

    const dto = new TeamProjectResponseDto(project, 0);

    expect(dto.statusVariant).toBe('code_analyzed');
    // 100 - (bugs*3 + vulnerabilities*5 + hotspots*2 + smells*1) = 100 - (3 + 0 + 0 + 2) = 95
    expect(dto.statusLabel).toBe('코드 분석 완료 · 95점');
  });

  it('코드 분석은 없고 요구사항만 있으면 "요구사항만 있음 · 코드 없음"으로 표시한다', () => {
    const dto = new TeamProjectResponseDto(baseProject, 3);

    expect(dto.statusVariant).toBe('requirements_only');
    expect(dto.statusLabel).toBe('요구사항만 있음 · 코드 없음');
    expect(dto.requirementsCount).toBe(3);
  });

  it('코드도 요구사항도 없으면 "분석 대기 중"으로 표시한다', () => {
    const dto = new TeamProjectResponseDto(baseProject, 0);

    expect(dto.statusVariant).toBe('empty');
    expect(dto.statusLabel).toBe('분석 대기 중');
  });
});
