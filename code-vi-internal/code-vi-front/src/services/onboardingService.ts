import api from './api';
import { authService } from './authService';

export const onboardingService = {
  onboardProject: async (repoUrl: string, pat: string): Promise<any> => {
    const publicKey = await authService.getRsaPublicKey();
    const encryptedPat = await authService.encryptPat(pat, publicKey);
    const res = await api.post('/api/onboarding', { repoUrl, encryptedPat });
    // 백엔드 { success, data:{ jobName, ... } } 래핑 해제 → result.jobName 이 실제 값이 되도록
    return res.data?.data ?? res.data;
  },
};
