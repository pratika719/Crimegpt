import { Module } from '@nestjs/common';
import { LoggerModule as NestjsPinoModule } from 'nestjs-pino';

@Module({
  imports: [
    NestjsPinoModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'accessToken',
            'refreshToken',
            'DATABASE_URL',
            'REDIS_URL',
            'GEMINI_API_KEY',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
  ],
})
export class LoggerModule {}
