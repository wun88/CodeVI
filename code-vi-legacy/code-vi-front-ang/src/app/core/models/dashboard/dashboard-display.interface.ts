export interface TableColumn {
  key: string;
  label: string;
  width?: string;
}

export type TabType = 'team' | 'course' | 'individual';

// 팀별 탭에 표시될 데이터 규격
export interface TeamDisplayItem {
  buildNumber: number;
  date: string;
  teamName: string;
  members: string;
  bugCount: number;
  riskCount: number;
  ncloc: number;
  codeSmells: number; // 추가
  complexity: number; // 추가
  action: string;
}