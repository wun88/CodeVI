import api from './api';

// 백엔드 PartialAnalysisDto가 허용하는 언어 값
export type SnippetLanguage = 'typescript' | 'javascript' | 'python' | 'c' | 'java';

export interface SnippetMetrics {
  cyclomaticComplexity: number;
  couplingCount: number;
  parameterCount: number;
  totalLines: number;
}

export interface SnippetAstGraph {
  nodes: any[];
  edges: any[];
}

export interface SnippetAnalysisResult {
  metrics: SnippetMetrics;
  ast: SnippetAstGraph;
}

export const codeAnalysisService = {
  /**
   * 코드 스니펫 1회성 분석 — POST /api/code-analysis/snippet
   * same-origin(api 인스턴스) 경유라 로컬/운영 어디서든 nginx 프록시를 타고 백엔드로 붙는다.
   */
  analyzeSnippet: async (
    code: string,
    language: SnippetLanguage,
  ): Promise<SnippetAnalysisResult> => {
    const res = await api.post('/api/code-analysis/snippet', { code, language });
    return res.data.data;
  },
};
