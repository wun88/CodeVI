import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { NvidiaLlmService } from './nvidia-llm.service';
import { LlmGenerationError } from './llm.errors';

describe('NvidiaLlmService', () => {
  function buildService(
    configValues: Record<string, string | undefined>,
    postImpl: jest.Mock,
  ) {
    const httpService = { post: postImpl } as unknown as HttpService;
    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    return new NvidiaLlmService(httpService, configService);
  }

  it('throws LlmGenerationError when NVIDIA_API_KEY is not configured', async () => {
    const post = jest.fn();
    const service = buildService({}, post);

    await expect(service.generateJson('sys', 'user')).rejects.toThrow(
      LlmGenerationError,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('posts to the chat completions endpoint with Bearer auth and parses JSON content', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: {
          choices: [
            { message: { content: '[{"classId":1,"improvedCode":"x"}]' } },
          ],
        },
      }),
    );
    const service = buildService(
      {
        NVIDIA_API_KEY: 'test-key',
        NVIDIA_API_BASE_URL: 'https://example.com/v1',
        NVIDIA_MODEL: 'test-model',
      },
      post,
    );

    const result = await service.generateJson('sys', 'user');

    expect(result).toEqual([{ classId: 1, improvedCode: 'x' }]);
    expect(post).toHaveBeenCalledWith(
      'https://example.com/v1/chat/completions',
      expect.objectContaining({ model: 'test-model' }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
      }),
    );
  });

  it('extracts JSON when the model wraps it in a code fence', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: {
          choices: [
            {
              message: {
                content: '```json\n[{"classId":2,"improvedCode":"y"}]\n```',
              },
            },
          ],
        },
      }),
    );
    const service = buildService({ NVIDIA_API_KEY: 'k' }, post);

    const result = await service.generateJson('sys', 'user');
    expect(result).toEqual([{ classId: 2, improvedCode: 'y' }]);
  });

  it('throws LlmGenerationError when the response cannot be parsed as JSON', async () => {
    const post = jest
      .fn()
      .mockReturnValue(
        of({ data: { choices: [{ message: { content: 'no json here' } }] } }),
      );
    const service = buildService({ NVIDIA_API_KEY: 'k' }, post);

    await expect(service.generateJson('sys', 'user')).rejects.toThrow(
      LlmGenerationError,
    );
  });

  it('wraps HTTP failures in LlmGenerationError', async () => {
    const post = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('network down')));
    const service = buildService({ NVIDIA_API_KEY: 'k' }, post);

    await expect(service.generateJson('sys', 'user')).rejects.toThrow(
      LlmGenerationError,
    );
  });
});
