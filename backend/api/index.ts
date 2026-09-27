import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

const server: Express = express();
let isAppInitialized = false;

async function bootstrap() {
  // Ensure background worker doesn't run inside serverless function
  process.env.ENABLE_WORKER = 'false';

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

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

  await app.init();
  isAppInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!isAppInitialized) {
      await bootstrap();
    }
    return server(req, res);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('NestJS Vercel Bootstrap failed:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'BOOTSTRAP_FAILED',
      message: error?.message || 'NestJS serverless bootstrap failed',
    });
  }
}
