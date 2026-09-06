import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Logger } from '@nestjs/common';

/**
 * PromptSecurityInterceptor — defense-in-depth placeholder.
 *
 * Real protection against prompt injection is implemented in GeminiService by
 * passing PROMPT_SECURITY_INSTRUCTIONS as Gemini's systemInstruction parameter
 * (harder to override than a prepended string). This interceptor is a thin
 * additional layer that can, in future, reject obviously malicious inputs
 * before they reach AI endpoints.
 *
 * For now it logs and passes through — no request is blocked by this interceptor.
 */
@Injectable()
export class PromptSecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PromptSecurityInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const body = req.body as Record<string, unknown> | undefined;

    // Future: inspect body for injection patterns and reject early.
    // See PROMPT_SECURITY_INSTRUCTIONS in backend/src/ai/constants/ai.constants.ts
    // and GeminiService.systemInstruction for the real mitigation.

    return next.handle().pipe(
      map((data) => data),
    );
  }
}
