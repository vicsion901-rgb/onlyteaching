import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';

let cachedApp: INestApplication;

async function bootstrap(): Promise<INestApplication> {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.enableCors({ origin: true, credentials: true });

  // Swagger 제거 — swagger-ui-express 정적 에셋이 ncc 번들 크기를
  // 초과시켜 Vercel FUNCTION_INVOCATION_FAILED 유발.
  // API 문서는 로컬 개발(main.ts)에서만 사용.

  await app.init();
  cachedApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    const expressApp = app.getHttpAdapter().getInstance();
    return expressApp(req, res);
  } catch (err: any) {
    console.error('NestJS bootstrap FATAL:', err?.message, err?.stack);
    res.status(500).json({
      error: 'NestJS bootstrap failed',
      message: err?.message || 'unknown',
    });
  }
}
