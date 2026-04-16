import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import * as fs from 'fs';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  let httpsOptions: any = undefined;
  if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
    try {
      httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      };
    } catch (error) {
      Logger.error('SSL 키/인증서 파일 로딩 오류:', error);
      // 파일 로딩 실패 시 HTTPS를 비활성화하거나 다른 처리 수행 (현재는 undefined 유지) 
    }
  } else {
    Logger.warn('SSL 키 또는 인증서 경로가 정의되지 않았습니다. HTTP로 실행합니다.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  // 최대 요청 크기 설정 (예: 1000MB)
  app.use(bodyParser.json({ limit: '1000mb' }));
  app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

  app.setGlobalPrefix('api')

  const config = new DocumentBuilder()
    .setTitle('MP Project API')
    .setDescription('MP Project 백엔드 API 문서입니다.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // CORS 설정
  const allowedOrigins = [
    process.env.DEPLOY_FRONTEND_URL1,
    process.env.DEPLOY_FRONTEND_URL2,
    process.env.DEPLOY_FRONTEND_URL3,
    process.env.DEPLOY_FRONTEND_URL4,
    process.env.DEPLOY_FRONTEND_URL5,
    process.env.DEPLOY_FRONTEND_URL6,
    process.env.DEVELOP_FRONTEND_URL || 'http://localhost:4200', // 개발 환경 기본값
    // 'http://192.168.0.25:18080',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Authorization'],
  });

  // 정적 파일 서빙 설정
  app.useStaticAssets(join(__dirname, '../..', 'Front-end', 'www'), {
    prefix: '/',
  });

  const port = process.env.SERVER_PORT || 13000;
  await app.listen(port, process.env.SERVER_HOST || '0.0.0.0');
  Logger.log(`🔗 [CodeVi Unified Server] Running on port ${port}`);
  Logger.log(`📦 Primary storage: Relational AST (Directory→File→Class→Function)`);
  Logger.log(`📄 Swagger: http://localhost:${port}/api`);
  // Legacy: JSON AST 저장은 비활성화됨. 추후 HDD 아키텍처로 분리 예정.
}
bootstrap();