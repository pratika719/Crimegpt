import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Prompt-injection patterns.
 *
 * Deliberately CONSERVATIVE: the goal is to catch unambiguous override
 * attempts while keeping the false-positive rate near zero, since legal case
 * data legitimately contains words like "instructions" or "system".
 *
 * - `confidence: 'block'` — near-certain injection attempts (requests to
 *   reveal/ignore system-level constraints). These REJECT the request.
 * - `confidence: 'flag'` — suspicious but plausibly legitimate. Logged for
 *   observability only.
 */
const INJECTION_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  confidence: 'block' | 'flag';
}> = [
  {
    name: 'reveal-system-prompt',
    regex: /\b(reveal|show|print|repeat|output|ignore\s+(all\s+)?previous)\b[^.]{0,80}\b(system\s+(prompt|message|instructions?)|hidden\s+(prompt|instructions?)|initial\s+instructions?|developer\s+message)\b/i,
    confidence: 'block',
  },
  {
    name: 'ignore-instructions',
    regex: /\bignore\b[^.]{0,60}\b(all\s+)?(previous|prior|above|earlier)\b[^.]{0,40}\b(instructions?|prompts?|rules?|constraints?)\b/i,
    confidence: 'block',
  },
  {
    name: 'reveal-api-key',
    // Matches both orders: "api key ... reveal" and "reveal ... api key"
    regex: /\b(api[_\s-]?key|secret\s+key|access\s+token|environment\s+variables?)\b[^.]{0,60}\b(reveal|show|print|list|expose|display|leak)\b|\b(reveal|show|print|list|expose|display|leak)\b[^.]{0,60}\b(api[_\s-]?key|secret\s+key|access\s+token|environment\s+variables?)\b/i,
    confidence: 'block',
  },
  {
    name: 'role-override',
    regex: /\byou\s+are\s+now\s+(a|an|the)\b[^.]{0,80}\b(no\s+longer\s+bound|unrestricted|unfiltered|jailbroken)\b/i,
    confidence: 'flag',
  },
  {
    name: 'developer-mode',
    regex: /\b(developer|dan|god)\s+mode\b/i,
    confidence: 'flag',
  },
  {
    name: 'system-prompt-mention',
    regex: /\bsystem\s+(prompt|message)\b/i,
    confidence: 'flag',
  },
];

/** Extract all string values from an arbitrary JSON body (depth-capped). */
function collectStrings(value: unknown, depth = 0, out: string[] = []): string[] {
  if (out.length > 200 || depth > 10) return out;
  if (typeof value === 'string') {
    if (value.length > 0) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, depth + 1, out);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, depth + 1, out);
  }
  return out;
}

/**
 * Scan a request body for prompt-injection patterns.
 *
 * AI-generated documents route user-controlled case data (narratives,
 * witness statements, evidence text) into Gemini prompts, so this is a
 * genuine attack surface — see PROMPT_SECURITY_INSTRUCTIONS in
 * ai.constants.ts for the systemInstruction-side mitigation.
 */
@Injectable()
export class PromptSecurityInterceptor implements NestInterceptor {
  private static readonly MAX_BODY_BYTES = 1_000_000; // 1 MB
  private readonly logger = new Logger(PromptSecurityInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const body = req.body;

    if (body !== undefined && body !== null) {
      const serialized = (() => {
        try {
          const s = JSON.stringify(body);
          return s.length > PromptSecurityInterceptor.MAX_BODY_BYTES
            ? undefined // oversize — skip content scan (body size itself is capped upstream)
            : s;
        } catch {
          return undefined; // circular refs etc.
        }
      })();

      if (serialized !== undefined) {
        const candidates = collectStrings(body);
        const matches: string[] = [];

        for (const text of candidates) {
          for (const { name, regex, confidence } of INJECTION_PATTERNS) {
            if (regex.test(text)) {
              if (confidence === 'block') {
                this.logger.warn(
                  { path: req.url, pattern: name },
                  'Prompt-injection attempt blocked',
                );
                throw new BadRequestException(
                  `Request rejected: suspicious instruction pattern detected (${name}).`,
                );
              }
              matches.push(name);
            }
          }
        }

        if (matches.length > 0) {
          this.logger.warn(
            { path: req.url, patterns: [...new Set(matches)] },
            'Suspicious prompt patterns flagged (passthrough)',
          );
        }
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Post-handler hook: reserved for response-side audit logging.
      }),
    );
  }
}
