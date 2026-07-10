/**
 * 메트릭 카탈로그 — UI 렌더를 구동하는 단일 진실 소스(하드코딩 제거).
 * applicableLanguages로 N/A(예: C의 DIT/NOC) 처리.
 */
export interface MetricCatalogEntry {
  key: string;
  label: string;
  description: string;
  direction: 'lower_better' | 'higher_better' | 'context';
  applicableLanguages: string[];
}

export const METRIC_CATALOG: MetricCatalogEntry[] = [
  { key: 'cbo', label: 'CBO', description: 'Coupling Between Objects', direction: 'lower_better', applicableLanguages: ['python', 'java', 'c', 'typescript'] },
  { key: 'rfc', label: 'RFC', description: 'Response For a Class', direction: 'lower_better', applicableLanguages: ['python', 'java', 'c', 'typescript'] },
  { key: 'lcom', label: 'LCOM', description: 'Lack of Cohesion of Methods', direction: 'lower_better', applicableLanguages: ['python', 'java', 'c', 'typescript'] },
  { key: 'wmc', label: 'WMC', description: 'Weighted Methods per Class', direction: 'lower_better', applicableLanguages: ['python', 'java', 'c', 'typescript'] },
  { key: 'dit', label: 'DIT', description: 'Depth of Inheritance Tree', direction: 'lower_better', applicableLanguages: ['python', 'java', 'typescript'] },
  { key: 'noc', label: 'NOC', description: 'Number of Children', direction: 'context', applicableLanguages: ['python', 'java', 'typescript'] },
  { key: 'nom', label: 'NOM', description: 'Number of Methods', direction: 'context', applicableLanguages: ['python', 'java', 'c', 'typescript'] },
];
