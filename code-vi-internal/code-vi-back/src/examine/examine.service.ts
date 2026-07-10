import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * examine 어댑터 클라이언트 — 언어별 examine 서비스의 /codegraph를 호출해
 * 언어 무관 캐노니컬 CodeGraph를 받는다. (zip 1회성·스니펫 등 백엔드 주도 분석에 사용)
 * CI 파이프라인은 Jenkins stage에서 직접 호출하므로 여기 거치지 않음.
 */
@Injectable()
export class ExamineService {
  private readonly logger = new Logger(ExamineService.name);

  constructor(private readonly config: ConfigService) {}

  // 언어별 컨테이너 DNS 기본값 (compose 서비스명:포트). env로 override 가능.
  private static readonly DEFAULTS: Record<string, string> = {
    python: 'http://codevi-pyexamine:3003',
    c: 'http://codevi-cexamine:3004',
    java: 'http://codevi-jexamine:3005',
    typescript: 'http://codevi-tsexamine:3006',
  };

  private baseUrlFor(language: string): string {
    const lang = (language || 'python').toLowerCase();
    const envMap: Record<string, string | undefined> = {
      python: this.config.get<string>('EXAMINE_PYTHON_URL'),
      java: this.config.get<string>('EXAMINE_JAVA_URL'),
      c: this.config.get<string>('EXAMINE_C_URL'),
      typescript: this.config.get<string>('EXAMINE_TS_URL'),
    };
    // env override → 언어별 컨테이너 기본값 → python 폴백.
    return (
      envMap[lang] ||
      ExamineService.DEFAULTS[lang] ||
      envMap['python'] ||
      ExamineService.DEFAULTS['python']
    );
  }

  /** zip 버퍼 → 캐노니컬 CodeGraph (해당 언어 examine 서비스). */
  async getCodeGraphFromZip(zipBuffer: Buffer, filename: string, language = 'python'): Promise<any> {
    const url = `${this.baseUrlFor(language)}/codegraph`;
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' }), filename);

    const res = await axios.post(url, form, {
      maxBodyLength: Number.POSITIVE_INFINITY,
      maxContentLength: Number.POSITIVE_INFINITY,
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      this.logger.error(`examine(${language}) ${url} → ${res.status}`);
      throw new BadGatewayException(`examine(${language}) failed: ${res.status}`);
    }
    return res.data;
  }
}
