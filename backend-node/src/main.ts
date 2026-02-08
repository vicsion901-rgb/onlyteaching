import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as path from 'path';

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

  // Mount custom Express routes (legacy-style) under NestJS (Express adapter)
  // This keeps the requested file location: backend-node/routes/creativeActivities.js
  const expressInstance = app.getHttpAdapter().getInstance();
  // Works both in src (dev) and dist (prod) if we handle path correctly
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const creativeActivitiesRouter = require('./legacy-routes/creativeActivities.js');
  expressInstance.use('/creative-activities', creativeActivitiesRouter);

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0'; // bind all interfaces for LAN access
  await app.listen(port, host);
}

bootstrap();