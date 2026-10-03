import * as jsonwebtoken from 'jsonwebtoken';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma';
import { RedisService } from '../src/common/redis';
import { JwtService } from '@nestjs/jwt';
import { QUEUE_NAMES } from '../src/modules/queue/queue-names';

// ---------------------------------------------------------------------------
// Module mocks — @nestjs/passport, @nestjs/bullmq, and bullmq ship ESM-only
// builds that jest's CJS pipeline cannot parse.
//
// The passport mock KEEPS the security behavior under test: the stub guard
// performs real JWT verification (JwtService), the real cookie/Bearer
// extraction rules, and the real DB user-existence check. Only Passport's
// strategy transport layer is replaced. bullmq mocks supply the decorator /
// token surface only.
// ---------------------------------------------------------------------------

jest.mock('@nestjs/passport', () => ({
  // Must be a class — AuthModule does `exports: [PassportModule]`.
  PassportModule: class PassportModule {
    static register(): object {
      return { global: false, module: this, providers: [], exports: [] };
    }
  },
  // Strategies still import/pass through this HOF; the real authz path in
  // this suite is the stubbed AuthGuard below, not strategy registration.
  PassportStrategy: (Base: new (...args: never[]) => unknown) => Base,
  AuthGuard: (strategy: string) => {
    // Real guard logic for the strategy the app actually uses for authz.
    if (strategy === 'jwt') {
      class JwtE2EGuard {
        constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
        async canActivate(context: any): Promise<boolean> {
          const req = context.switchToHttp().getRequest();
          const token = extractToken(req);
          if (!token) throw new UnauthorizedException('Missing bearer token');

          let payload: { sub?: string };
          try {
            payload = this.jwt.verify(token);
          } catch {
            throw new UnauthorizedException('Invalid token');
          }
          if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');

          const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
          if (!user) throw new UnauthorizedException('User not found');

          req.user = { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined };
          return true;
        }
      }
      return JwtE2EGuard;
    }
    // Other strategies (google) — never asserted in this suite.
    return class {};
  },
}));

/** Mirrors the extraction rules in jwt.strategy.ts (cookie-first, then Bearer). */
function extractToken(req: {
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}): string | null {
  const header = req.headers?.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null;
  }
  return req.cookies?.['auth_token'] ?? null;
}

jest.mock('@nestjs/bullmq', () => {
  const tokenFor = (name: string | symbol) => `bullmq:${String(name)}`;
  // Must be a class — QueueModule does `exports: [BullModule]` and Nest can
  // only export classes/modules, not plain objects.
  class BullModule {
    static forRoot(): object {
      return { global: true, module: BullModule, providers: [], exports: [] };
    }
    static registerQueue(...items: Array<{ name?: string }>): object {
      return {
        global: false,
        module: BullModule,
        providers: [],
        exports: [],
        imports: [],
        providersExtra: items.map((i) => i.name),
      };
    }
  }
  return {
    getQueueToken: tokenFor,
    BullModule,
    // InjectQueue must return a real property decorator, not a value.
    InjectQueue: () => (): void => undefined,
    Processor: () => () => undefined,
    WorkerHost: class {},
    JOB_REF: 'JOB_REF',
  };
});

jest.mock('bullmq', () => {
  class MockQueue {
    add = async () => ({ id: 'e2e-stub-job' });
    addBulk = async () => [];
    getJobs = async () => [];
    getJob = async () => null;
    getJobCounts = async () => ({});
    close = async () => undefined;
  }
  class MockWorker {}
  class MockFlowProducer {}
  return { Queue: MockQueue, Worker: MockWorker, FlowProducer: MockFlowProducer };
});

// JwtService stub backed by the real CJS jsonwebtoken package — the same
// crypto the production JwtService uses. Secret read at call time so the
// fail-fast AUTH_SECRET check in JwtStrategy is still the boot gate.
jest.mock('@nestjs/jwt', () => {
  class JwtServiceStub {
    sign(payload: object, opts?: { expiresIn?: string }): string {
      const secret = process.env.AUTH_SECRET || 'e2e-test-secret';
      return jsonwebtoken.sign(payload, secret, {
        expiresIn: (opts?.expiresIn ?? '24h') as any,
      });
    }
    verify(token: string): object {
      const secret = process.env.AUTH_SECRET || 'e2e-test-secret';
      return jsonwebtoken.verify(token, secret) as object;
    }
  }

  class JwtModuleStub {
    static registerAsync(): object {
      return {
        global: true,
        module: JwtModuleStub,
        providers: [JwtServiceStub],
        exports: [JwtServiceStub],
      };
    }
  }

  return { JwtModule: JwtModuleStub, JwtService: JwtServiceStub };
});

/** Minimal queue double — only the members the app touches at runtime. */
const QUEUE_DOUBLE = {
  add: async () => ({ id: 'e2e-stub-job' }),
  addBulk: async () => [],
  getJobs: async () => [],
  getJob: async () => null,
  getJobCounts: async () => ({}),
  close: async () => undefined,
};

/**
 * Auth flow e2e — JWT verification, profile, logout, and rate limiting.
 *
 * External services are replaced with in-memory doubles:
 *   - RedisService: ping/get/set/del short-circuit (no network)
 *   - BullMQ queues: QUEUE_DOUBLE (no network)
 * Prisma is kept real — the JWT strategy's DB user check is exactly the
 * behavior under test. Point DATABASE_URL at a disposable database.
 *
 * Requires AUTH_SECRET in the environment (JwtStrategy fail-fast at boot).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const TEST_SECRET = 'e2e-test-secret';

  beforeAll(async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || TEST_SECRET;
    process.env.DOCGEN_REPAIR_RETRY = 'false';

    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RedisService)
      .useValue({
        ping: async () => 'ok',
        get: async () => null,
        set: async () => 'OK',
        setex: async () => 'OK',
        del: async () => 1,
        delPattern: async () => 0,
        isConnected: () => true,
      });

    // BullMQ queue providers are dynamic (token-based), so they are targeted
    // by token rather than by class. All overrides must be registered on the
    // builder BEFORE compile().
    for (const name of Object.values(QUEUE_NAMES)) {
      builder.overrideProvider(`bullmq:${name}`).useValue({ ...QUEUE_DOUBLE });
    }

    const moduleFixture: TestingModule = await builder.compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestUser() {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@crimegpt.test`;
    return prisma.user.create({
      data: { email, name: 'E2E Tester', emailVerified: new Date() },
    });
  }

  it('GET /api/auth/me → 401 without a token', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me → 401 with a garbage token', () => {
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
  });

  it('GET /api/auth/me → 401 when the JWT references a deleted user', async () => {
    const token = jwt.sign({ sub: 'does-not-exist-cuid' });
    return request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('GET /api/auth/me → 200 with a valid Bearer token for an existing user', async () => {
    const user = await createTestUser();
    const token = jwt.sign({ sub: user.id, email: user.email, name: user.name });

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      data: { id: user.id, email: user.email, name: 'E2E Tester' },
    });
  });

  it('GET /api/auth/me → 200 with the auth_token cookie (no Bearer header)', async () => {
    const user = await createTestUser();
    const token = jwt.sign({ sub: user.id });

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', `auth_token=${token}`)
      .expect(200);

    expect(res.body.data.id).toBe(user.id);
  });

  it('POST /api/auth/logout → 204 and clears the cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .expect(204);

    expect(res.headers['set-cookie'][0]).toMatch(/auth_token=;/);
  });

  it('rejects the 6th document-generation request within 10 minutes (per-user throttle)', async () => {
    const user = await createTestUser();
    const token = jwt.sign({ sub: user.id });

    // The case must exist and belong to the user or the endpoint 404s before throttling matters.
    const caseRecord = await prisma.case.create({
      data: { title: 'Throttle case', narrative: 'n', userId: user.id },
    });

    const post = () =>
      request(app.getHttpServer())
        .post(`/api/cases/${caseRecord.id}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .send({ documentType: 'FIR' });

    // 5 allowed, 6th throttled
    for (let i = 0; i < 5; i++) {
      await post().expect(202);
    }
    await post().expect(429);
  });
});
