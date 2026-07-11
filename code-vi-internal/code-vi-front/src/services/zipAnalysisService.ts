import api from './api';

export interface ZipAnalysisResult {
  success: boolean;
  message: string;
  data: {
    nodes: any[];
  };
}

export const zipAnalysisService = {
  /**
   * ZIP 1회성 분석 — POST /api/zip-analysis (multipart)
   * DB에 저장하지 않는 비영속 분석: zip → parser(tree-sitter) → AST 트리 반환.
   */
  analyzeZip: async (
    file: File,
    repoName?: string,
    onProgress?: (percent: number) => void,
  ): Promise<ZipAnalysisResult> => {
    const form = new FormData();
    form.append('file', file);
    if (repoName) form.append('repoName', repoName);

    const res = await api.post('/api/zip-analysis', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // 대형 zip은 파서 처리까지 기본 15s를 넘길 수 있어 별도 타임아웃
      timeout: 120000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data.data;
  },
};
