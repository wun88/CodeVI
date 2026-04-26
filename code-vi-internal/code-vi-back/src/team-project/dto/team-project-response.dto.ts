import { TeamProject } from '../entities/team-project.entity';
import { CodeAnalysis } from '../../code-analysis/entities/code-analysis.entity';

export class TeamProjectResponseDto {
  id: number;
  teamName: string;
  jenkinsJobName: string;
  members: string[];
  codeAnalysis: {
    buildNumber: number;
    status: string;
    bugs: number;
    vulnerabilities: number;
    securityHotspots: number;
    codeSmells: number;
    complexity: number;
    cognitiveComplexity: number;
    ncloc: number;
    createdAt: Date;
  } | null;

  constructor(project: TeamProject) {
    this.id = project.id;
    this.teamName = project.teamName;
    this.jenkinsJobName = project.JenkinsJobName;

    // ManyToMany 관계의 유저 이름만 추출
    this.members = project.users?.map((user) => user.username) ?? [];

    // 최신 분석 결과 매핑 (Service의 MapOne 결과)
    const analysis = (project as any).latestAnalysis;
    this.codeAnalysis = analysis
      ? {
          buildNumber: analysis.buildNumber,
          status: analysis.status,
          bugs: analysis.bugs,
          vulnerabilities: analysis.vulnerabilities,
          securityHotspots: analysis.security_hotspots,
          codeSmells: analysis.code_smells,
          complexity: analysis.complexity,
          cognitiveComplexity: analysis.cognitive_complexity,
          ncloc: analysis.ncloc,
          createdAt: analysis.createdAt,
        }
      : null;
  }
}
