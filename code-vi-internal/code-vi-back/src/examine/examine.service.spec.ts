import { ConfigService } from '@nestjs/config';
import { ExamineService } from './examine.service';

/**
 * ExamineService 언어 라우팅 단위 테스트.
 * baseUrlFor 는 private — (svc as any) 로 접근해 라우팅 표만 검증한다(네트워크 X).
 */
describe('ExamineService.baseUrlFor', () => {
  const make = (env: Record<string, string | undefined> = {}) => {
    const config = { get: (k: string) => env[k] } as unknown as ConfigService;
    return new ExamineService(config);
  };
  const url = (svc: ExamineService, lang: string) =>
    (svc as unknown as { baseUrlFor(l: string): string }).baseUrlFor(lang);

  it('env 없으면 언어별 컨테이너 DNS 기본값으로 라우팅', () => {
    const svc = make();
    expect(url(svc, 'python')).toBe('http://codevi-pyexamine:3003');
    expect(url(svc, 'c')).toBe('http://codevi-cexamine:3004');
    expect(url(svc, 'java')).toBe('http://codevi-jexamine:3005');
    expect(url(svc, 'typescript')).toBe('http://codevi-tsexamine:3006');
  });

  it('대소문자 무시', () => {
    const svc = make();
    expect(url(svc, 'Java')).toBe('http://codevi-jexamine:3005');
    expect(url(svc, 'TypeScript')).toBe('http://codevi-tsexamine:3006');
  });

  it('미지원 언어는 python 기본값으로 폴백', () => {
    const svc = make();
    expect(url(svc, 'rust')).toBe('http://codevi-pyexamine:3003');
    expect(url(svc, '')).toBe('http://codevi-pyexamine:3003');
  });

  it('env override 가 컨테이너 기본값보다 우선', () => {
    const svc = make({
      EXAMINE_C_URL: 'http://localhost:3004',
      EXAMINE_JAVA_URL: 'http://localhost:3005',
      EXAMINE_TS_URL: 'http://localhost:3006',
      EXAMINE_PYTHON_URL: 'http://localhost:3003',
    });
    expect(url(svc, 'c')).toBe('http://localhost:3004');
    expect(url(svc, 'java')).toBe('http://localhost:3005');
    expect(url(svc, 'typescript')).toBe('http://localhost:3006');
    expect(url(svc, 'python')).toBe('http://localhost:3003');
  });
});

/**
 * 언어 게이팅 + best-effort 동작.
 * 배포된 examine 은 python 하나뿐이므로, 나머지는 네트워크를 태우지 않고 null 이어야 한다.
 */
describe('ExamineService 언어 게이팅 / best-effort', () => {
  const make = (env: Record<string, string | undefined> = {}) => {
    const config = { get: (k: string) => env[k] } as unknown as ConfigService;
    return new ExamineService(config);
  };

  it('EXAMINE_LANGUAGES 미설정이면 python 만 허용', () => {
    const svc = make();
    expect(svc.isEnabled('python')).toBe(true);
    expect(svc.isEnabled('java')).toBe(false);
    expect(svc.isEnabled('c')).toBe(false);
  });

  it('EXAMINE_LANGUAGES 로 언어를 열 수 있고 "*" 는 전체 허용', () => {
    expect(make({ EXAMINE_LANGUAGES: 'python, java' }).isEnabled('java')).toBe(
      true,
    );
    expect(make({ EXAMINE_LANGUAGES: 'python, java' }).isEnabled('c')).toBe(
      false,
    );
    expect(make({ EXAMINE_LANGUAGES: '*' }).isEnabled('typescript')).toBe(true);
  });

  it('미허용 언어는 호출 없이 null', async () => {
    const svc = make();
    const spy = jest.spyOn(svc, 'getCodeGraphFromSnippet');
    await expect(
      svc.tryGetCodeGraph({ code: 'class A {}' }, 'java'),
    ).resolves.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('examine 이 실패해도 예외 대신 null (분석 전체를 죽이지 않음)', async () => {
    const svc = make();
    jest
      .spyOn(svc, 'getCodeGraphFromSnippet')
      .mockRejectedValue(new Error('connect ECONNREFUSED'));
    await expect(
      svc.tryGetCodeGraph({ code: 'x = 1' }, 'python'),
    ).resolves.toBeNull();
  });

  it('성공하면 examine 응답을 그대로 반환', async () => {
    const svc = make();
    const payload = {
      language: 'python',
      parser: 'ast',
      units: [],
      relations: [],
      findings: [],
      catalog: [],
    };
    jest.spyOn(svc, 'getCodeGraphFromSnippet').mockResolvedValue(payload);
    await expect(
      svc.tryGetCodeGraph({ code: 'x = 1' }, 'python'),
    ).resolves.toBe(payload);
  });
});
