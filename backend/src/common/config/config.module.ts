import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigModuleOptions } from '@nestjs/config';
import configuration from './configuration';
import { validateEnv } from './env.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
      validate: validateEnv,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {
  static forRoot(options?: ConfigModuleOptions): DynamicModule {
    return {
      module: ConfigModule,
      imports: [
        NestConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
          load: [configuration],
          validate: validateEnv,
          ...options,
        }),
      ],
      exports: [NestConfigModule],
    };
  }
}

export const AppConfigModule = ConfigModule;
