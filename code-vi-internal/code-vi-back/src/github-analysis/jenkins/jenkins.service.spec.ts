import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { JenkinsService } from './jenkins.service';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    isAxiosError: (e: unknown) =>
      (e as { isAxiosError?: boolean } | null)?.isAxiosError === true,
  },
}));

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;

const axiosError = (status: number, message = `HTTP ${status}`) => ({
  isAxiosError: true,
  response: { status },
  message,
});

/**
 * JenkinsService — 사용자별 credential 등록/갱신과 잡 config 갱신(공용 PAT → 사용자 OAuth 토큰
 * 전환의 핵심 경로) 검증. axios는 전부 모킹하고 호출 URL/바디만 확인한다.
 */
describe('JenkinsService', () => {
  let service: JenkinsService;

  beforeEach(() => {
    jest.clearAllMocks();
    // crumb 발급은 꺼져 있는 환경으로 가정 — 실패해도 계속 진행하는 경로를 함께 검증한다.
    mockedGet.mockRejectedValue(new Error('crumb issuer disabled'));
    service = new JenkinsService();
  });

  describe('ensureUserCredential', () => {
    it('기존 credential이 있으면 config.xml 갱신만 한다', async () => {
      mockedPost.mockResolvedValue({});

      await service.ensureUserCredential('github-oauth-u7', 'octo', 'tok-123');

      expect(mockedPost).toHaveBeenCalledTimes(1);
      const [url, body] = mockedPost.mock.calls[0] as [string, string];
      expect(url).toContain('/credential/github-oauth-u7/config.xml');
      expect(body).toContain('<username>octo</username>');
      expect(body).toContain('<password>tok-123</password>');
    });

    it('credential이 없으면(404) createCredentials로 새로 만든다', async () => {
      mockedPost
        .mockRejectedValueOnce(axiosError(404))
        .mockResolvedValueOnce({});

      await service.ensureUserCredential('github-oauth-u7', 'octo', 'tok-123');

      expect(mockedPost).toHaveBeenCalledTimes(2);
      const [url] = mockedPost.mock.calls[1] as [string];
      expect(url).toContain('/createCredentials');
    });

    it('404 외 실패는 BadRequestException으로 전파한다', async () => {
      mockedPost.mockRejectedValue(axiosError(500, 'boom'));

      await expect(
        service.ensureUserCredential('github-oauth-u7', 'octo', 'tok-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('토큰/사용자명에 XML 특수문자가 있어도 이스케이프되어 실린다', async () => {
      mockedPost.mockResolvedValue({});

      await service.ensureUserCredential('id', 'a&b<c>', 'tok"&\'');

      const [, body] = mockedPost.mock.calls[0] as [string, string];
      expect(body).toContain('<username>a&amp;b&lt;c&gt;</username>');
      expect(body).toContain('<password>tok&quot;&amp;&apos;</password>');
      expect(body).not.toContain('<c>');
    });
  });

  describe('createPipelineJob', () => {
    it('신규 잡 생성 시 전달받은 credentialsId가 config XML에 들어간다', async () => {
      mockedPost.mockResolvedValue({});

      await service.createPipelineJob(
        'octo-demo',
        'https://github.com/octo/demo',
        'github-oauth-u7',
      );

      // 1번째: createItem, 2번째: 빌드 트리거
      expect(mockedPost).toHaveBeenCalledTimes(2);
      const [createUrl, configXml] = mockedPost.mock.calls[0] as [
        string,
        string,
      ];
      expect(createUrl).toContain('/createItem?name=octo-demo');
      expect(configXml).toContain(
        '<credentialsId>github-oauth-u7</credentialsId>',
      );
      const [buildUrl] = mockedPost.mock.calls[1] as [string];
      expect(buildUrl).toContain('/job/octo-demo/build');
    });

    it('이미 있는 잡(400)이면 config를 덮어쓴 뒤 빌드를 트리거한다 — PAT→OAuth 전환 복구 경로', async () => {
      mockedPost
        .mockRejectedValueOnce(axiosError(400, 'already exists'))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await service.createPipelineJob(
        'octo-demo',
        'https://github.com/octo/demo',
        'github-oauth-u7',
      );

      expect(mockedPost).toHaveBeenCalledTimes(3);
      const [updateUrl, configXml] = mockedPost.mock.calls[1] as [
        string,
        string,
      ];
      expect(updateUrl).toContain('/job/octo-demo/config.xml');
      expect(configXml).toContain(
        '<credentialsId>github-oauth-u7</credentialsId>',
      );
      const [buildUrl] = mockedPost.mock.calls[2] as [string];
      expect(buildUrl).toContain('/job/octo-demo/build');
    });

    it('credentialsId를 생략하면 기존 공용 credential을 유지한다 (하위 호환)', async () => {
      mockedPost.mockResolvedValue({});

      await service.createPipelineJob(
        'octo-demo',
        'https://github.com/octo/demo',
      );

      const [, configXml] = mockedPost.mock.calls[0] as [string, string];
      expect(configXml).toContain(
        '<credentialsId>github-credentials</credentialsId>',
      );
    });
  });
});
