import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Allow same-origin and LAN access (frontend may be opened via IP)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('OnlyT API')
    .setDescription('Only Teaching Backend API Docs')
    .setVersion('1.0')
    .build();

  // ✅ 여기 두 줄만 고침
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api', app as any, document);

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(port, host);
}

bootstrap();