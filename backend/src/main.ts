import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Bootstrap');

  // Global API prefix: all routes start with /api
  app.setGlobalPrefix('api');

  // Enable CORS for the Next.js frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe — validates incoming requests with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger / OpenAPI docs
  const config = new DocumentBuilder()
    .setTitle('CrimeGPT API')
    .setDescription('AI-powered criminal case management backend')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('cases', 'Case management operations')
    .addTag('documents', 'AI document generation')
    .addTag('evidence', 'Evidence management')
    .addTag('search', 'Case search')
    .addTag('audit', 'Audit trail')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`CrimeGPT API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
