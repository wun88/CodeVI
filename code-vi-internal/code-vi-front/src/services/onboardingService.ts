import api from './api';
import { authService } from './authService';

export const onboardingService = {
  onboardProject: async (repoUrl: string, pat: string): Promise<any> => {
    const publicKey = await authService.getRsaPublicKey();
    const encryptedPat = await authService.encryptPat(pat, publicKey);
    const res = await api.post('/api/onboarding', { repoUrl, encryptedPat });
    return res.data;
  },
};
