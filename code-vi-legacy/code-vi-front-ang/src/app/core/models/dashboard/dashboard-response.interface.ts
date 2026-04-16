export interface TeamProjectResponseDto {
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
    astDataId: number | null;
  } | null;
}

export interface TeamProjectResponseDtoWithAstData extends TeamProjectResponseDto {
  astData: any;
}