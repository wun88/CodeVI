/** LLM provider 호출/파싱 실패를 나타내는 공용 에러. 컨슈머는 provider 구현을 몰라도 이 타입만 잡으면 된다. */
export class LlmGenerationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'LlmGenerationError';
  }
}
