import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger: 로컬 개발에서만 로드 (프로덕션 번들에서 제외)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
      const config = new DocumentBuilder()
        .setTitle('OnlyT API')
        .setDescription('Only Teaching Backend API Docs')
        .setVersion('1.0')
        .build();
      const document = SwaggerModule.createDocument(app as any, config);
      SwaggerModule.setup('api-docs', app as any, document);
    } catch {
      // swagger 미설치 시 무시
    }
  }

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();