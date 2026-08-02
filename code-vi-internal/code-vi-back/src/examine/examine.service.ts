import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ZipEntry, createZip } from './zip-writer';
import { CanonicalCodeGraph } from './code-graph.interface';

/**
 * examine 어댑터 클라이언트 — 언어별 examine 서비스의 /codegraph를 호출해
 * 언어 무관 캐노니컬 CodeGraph를 받는다. (zip 1회성·스니펫 등 백엔드 주도 분석에 사용)
 * CI 파이프라인은 Jenkins stage에서 직접 호출하므로 여기 거치지 않음.
 *
 * 배포 현황상 실제로 떠 있는 컨테이너는 python(codevi-pyexamine:3003) 하나뿐이다.
 * 나머지 언어는 EXAMINE_LANGUAGES 로 열기 전까지 호출하지 않는다(enabledLanguages).
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

  /** 스니펫을 zip 으로 감쌀 때 쓰는 언어별 확장자. */
  private static readonly EXTENSIONS: Record<string, string> = {
    python: 'py',
    typescript: 'ts',
    javascript: 'js',
    java: 'java',
    c: 'c',
  };

  private static readonly DEFAULT_TIMEOUT_MS = 20_000;

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

  /**
   * examine 호출을 허용할 언어 집합.
   * EXAMINE_LANGUAGES(comma-separated) 미설정 시 배포된 python 만 허용한다 —
   * 미배포 언어로 매 요청 헛된 커넥션을 내지 않기 위함.
   */
  private enabledLanguages(): Set<string> {
    const raw = this.config.get<string>('EXAMINE_LANGUAGES') ?? 'python';
    const parsed = raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return new Set(parsed.length > 0 ? parsed : ['python']);
  }

  /** 해당 언어의 examine 서비스가 배포되어 호출 가능한가. */
  isEnabled(language: string): boolean {
    const enabled = this.enabledLanguages();
    return (
      enabled.has('*') || enabled.has((language || 'python').toLowerCase())
    );
  }

  private timeoutMs(): number {
    const raw = Number(this.config.get<string>('EXAMINE_TIMEOUT_MS'));
    return Number.isFinite(raw) && raw > 0
      ? raw
      : ExamineService.DEFAULT_TIMEOUT_MS;
  }

  /** zip 버퍼 → 캐노니컬 CodeGraph (해당 언어 examine 서비스). */
  async getCodeGraphFromZip(
    zipBuffer: Buffer,
    filename: string,
    language = 'python',
  ): Promise<CanonicalCodeGraph> {
    const url = `${this.baseUrlFor(language)}/codegraph`;
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(zipBuffer)], { type: 'application/zip' }),
      filename,
    );

    const res = await axios.post(url, form, {
      timeout: this.timeoutMs(),
      maxBodyLength: Number.POSITIVE_INFINITY,
      maxContentLength: Number.POSITIVE_INFINITY,
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      this.logger.error(`examine(${language}) ${url} → ${res.status}`);
      throw new BadGatewayException(
        `examine(${language}) failed: ${res.status}`,
      );
    }
    return res.data as CanonicalCodeGraph;
  }

  /** 메모리상의 소스 파일들 → zip → 캐노니컬 CodeGraph. */
  async getCodeGraphFromFiles(
    files: ZipEntry[],
    language = 'python',
  ): Promise<CanonicalCodeGraph> {
    return this.getCodeGraphFromZip(createZip(files), 'source.zip', language);
  }

  /** 단일 스니펫 → 캐노니컬 CodeGraph. 파일명은 언어별 확장자로 합성한다. */
  async getCodeGraphFromSnippet(
    code: string,
    language = 'python',
  ): Promise<CanonicalCodeGraph> {
    const lang = (language || 'python').toLowerCase();
    const ext = ExamineService.EXTENSIONS[lang] ?? lang;
    return this.getCodeGraphFromFiles(
      [{ path: `snippet.${ext}`, content: code }],
      lang,
    );
  }

  /**
   * best-effort 변형 — examine 이 죽었거나 해당 언어가 미배포여도 null 을 돌려준다.
   *
   * 스니펫/ZIP 분석은 tree-sitter 결과만으로도 성립하는 기능이므로, examine 장애가
   * 사용자 요청 전체를 실패시켜서는 안 된다. (Jenkins 파이프라인의 `|| echo '{}'` 와 동일한 태도)
   */
  async tryGetCodeGraph(
    source: { zip: Buffer; filename: string } | { code: string },
    language = 'python',
  ): Promise<CanonicalCodeGraph | null> {
    if (!this.isEnabled(language)) {
      this.logger.debug(
        `examine skipped: ${language} is not enabled (EXAMINE_LANGUAGES)`,
      );
      return null;
    }

    try {
      return 'zip' in source
        ? await this.getCodeGraphFromZip(source.zip, source.filename, language)
        : await this.getCodeGraphFromSnippet(source.code, language);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `examine(${language}) unavailable, continuing without it: ${message}`,
      );
      return null;
    }
  }
}
