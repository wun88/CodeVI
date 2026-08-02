import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ExamineService } from '../examine/examine.service';
import { ZipAnalysisModule } from './zip-analysis.module';
import { ZipAnalysisService } from './zip-analysis.service';

/**
 * DI 배선 검증 — ZipAnalysisService 가 ExamineService 를 실제로 주입받는지.
 * ExamineModule 의 exports 누락 같은 배선 실수는 컴파일이 아니라 여기서만 잡힌다. (네트워크 X)
 */
describe('ZipAnalysisModule DI', () => {
  it('ZipAnalysisService 가 ExamineService 를 주입받는다', async () => {
    const moduleRef = await Test.createTestingModule({
      // 프로덕션(app.module)과 동일하게 ConfigModule 은 전역 — ExamineModule 은 이를 전제한다.
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        ZipAnalysisModule,
      ],
    }).compile();

    const service = moduleRef.get(ZipAnalysisService);
    const examine = moduleRef.get(ExamineService);

    expect(service).toBeInstanceOf(ZipAnalysisService);
    expect(examine).toBeInstanceOf(ExamineService);
    expect(
      (service as unknown as { examineService: ExamineService }).examineService,
    ).toBe(examine);

    await moduleRef.close();
  });
});
