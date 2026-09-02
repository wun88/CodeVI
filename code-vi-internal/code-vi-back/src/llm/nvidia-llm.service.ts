import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { LlmGenerationError } from './llm.errors';

interface NvidiaChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * NVIDIA NIM(OpenAI 호환) 채팅 완성 API 클라이언트.
 * 컨슈머는 generateJson()만 사용하고 provider를 모른다 — 추후 다른 provider로 교체해도
 * 이 서비스 내부만 바뀌고 호출부(ast-relational 등)는 변경되지 않는다.
 */
@Injectable()
export class NvidiaLlmService {
  private readonly logger = new Logger(NvidiaLlmService.name);
  private static readonly DEFAULT_BASE_URL =
    'https://integrate.api.nvidia.com/v1';
  // meta/llama-3.3-70b-instruct는 2026-08-26 EOL로 카탈로그에서 제거되어 nemotron-3-super로 교체.
  // 2026-08-31엔 응답 편차(1.5초~60초+) 때문에 nemotron-3-nano-30b-a3b로 잠시 교체했으나,
  // 그 모델이 2026-09-01 09:00 UTC에 EOL(410 Gone)됐고, 후속으로 보이는
  // nemotron-nano-3-30b-a3b/nemotron-3.5-lightning-30b-a3b는 카탈로그엔 있어도 공용
  // chat/completions 게이트웨이에서 404/무응답이라(전용 NIM 배포가 별도로 필요한 것으로 보임)
  // super(120B)로 되돌림. 응답 편차는 여전하지만 유일하게 안정적으로 동작 확인된 모델.
  // (build.nvidia.com 카탈로그는 자주 바뀌므로 향후에도 재확인 필요 — 특히 위 nano 계열).
  private static readonly DEFAULT_MODEL = 'nvidia/nemotron-3-super-120b-a12b';
  private static readonly TIMEOUT_MS = 55_000;
  // 클래스 최대 4개분 JSON 배열(각 개선안 코드 포함)을 담기에 충분한 여유치.
  private static readonly MAX_TOKENS = 4000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * systemPrompt/userPrompt로 채팅 완성을 요청하고, 응답 텍스트를 JSON으로 파싱해 반환한다.
   * 실패(키 미설정/HTTP 에러/JSON 파싱 실패) 시 LlmGenerationError를 던진다 — 호출부가 폴백을 결정한다.
   */
  async generateJson(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const apiKey = this.configService.get<string>('NVIDIA_API_KEY');
    if (!apiKey) {
      throw new LlmGenerationError('NVIDIA_API_KEY is not configured');
    }
    const baseUrl =
      this.configService.get<string>('NVIDIA_API_BASE_URL') ??
      NvidiaLlmService.DEFAULT_BASE_URL;
    const model =
      this.configService.get<string>('NVIDIA_MODEL') ??
      NvidiaLlmService.DEFAULT_MODEL;

    const content = await this.postChatCompletion(
      baseUrl,
      model,
      apiKey,
      systemPrompt,
      userPrompt,
    );

    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new LlmGenerationError('NVIDIA API returned no content');
    }

    return this.parseJsonFromText(content);
  }

  /**
   * chat/completions를 호출한다. NVIDIA 무료 티어는 503(Service temporarily overloaded)이
   * 자주 발생하는데 보통 몇 초 안에 다시 시도하면 성공하므로, 503에 한해 짧은 대기 후
   * 최대 2번 더 시도한다(총 3회). 타임아웃(응답이 아예 없는 경우)은 이미 TIMEOUT_MS를
   * 다 써버린 뒤라 재시도하면 사용자를 지나치게 오래 기다리게 하므로 재시도하지 않는다.
   */
  private async postChatCompletion(
    baseUrl: string,
    model: string,
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const maxAttempts = 3;
    const retryDelaysMs = [1000, 2000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await lastValueFrom(
          this.httpService.post(
            `${baseUrl}/chat/completions`,
            {
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.3,
              max_tokens: NvidiaLlmService.MAX_TOKENS,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: NvidiaLlmService.TIMEOUT_MS,
            },
          ),
        );
        const data = response.data as NvidiaChatCompletionResponse;
        return data?.choices?.[0]?.message?.content;
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        const message = error instanceof Error ? error.message : String(error);
        const canRetry = status === 503 && attempt < maxAttempts;
        this.logger.error(
          `NVIDIA API call failed (attempt ${attempt}/${maxAttempts}): ${message}`,
        );
        if (!canRetry) {
          throw new LlmGenerationError(
            `NVIDIA API call failed: ${message}`,
            error,
          );
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelaysMs[attempt - 1]),
        );
      }
    }
    // maxAttempts >= 1이므로 도달하지 않지만 타입 체커를 위해 명시.
    throw new LlmGenerationError('NVIDIA API call failed: unreachable');
  }

  /** 모델이 코드펜스나 설명 문장을 덧붙인 경우를 대비해 첫 괄호~마지막 괄호 구간만 추출해 재시도한다. */
  private parseJsonFromText(text: string): unknown {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      const candidates = [trimmed.indexOf('{'), trimmed.indexOf('[')].filter(
        (i) => i >= 0,
      );
      const start = candidates.length > 0 ? Math.min(...candidates) : -1;
      const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(trimmed.slice(start, end + 1));
        } catch (innerError) {
          throw new LlmGenerationError(
            `Failed to parse JSON from NVIDIA response: ${trimmed.slice(0, 200)}`,
            innerError,
          );
        }
      }
      throw new LlmGenerationError(
        `Failed to parse JSON from NVIDIA response: ${trimmed.slice(0, 200)}`,
      );
    }
  }
}
