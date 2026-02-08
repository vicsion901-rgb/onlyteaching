import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export default async function handler(req, res) {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('OnlyT API')
    .setDescription('Only Teaching Backend API Docs')
    .setVersion('1.0')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Legacy Route 설정
  const expressInstance = app.getHttpAdapter().getInstance();
  // Vercel 환경에서는 상대 경로가 다를 수 있으므로 try-catch 처리 혹은 경로 조정
  try {
      // src/legacy-routes/creativeActivities.js 위치
      // Vercel 번들링 시 포함되도록 require 사용
      const creativeActivitiesRouter = require('../src/legacy-routes/creativeActivities.js');
      expressInstance.use('/creative-activities', creativeActivitiesRouter);
  } catch (e) {
      console.warn('Legacy routes loading failed', e);
  }

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}
