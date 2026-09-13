import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AUTH_SECRET_ENV_KEY, AUTH_TOKEN_TTL } from './auth.constants';

/**
 * AuthModule — Passport.js + JWT + Google OAuth.
 *
 * Exports JwtModule and PassportModule so other modules can inject JwtService
 * (e.g. for service-to-service tokens) or register additional strategies.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(AUTH_SECRET_ENV_KEY),
        signOptions: { expiresIn: AUTH_TOKEN_TTL },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, GoogleStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
