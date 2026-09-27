import { RateLimitGuard } from './throttler.guard';

/**
 * The guard's getTracker() only reads req.user / req.ips / req.ip — call it
 * with a `this` bound to a minimal stub, avoiding ThrottlerGuard's
 * constructor dependencies (injected reflector + storage).
 */
function callTracker(req: Record<string, unknown>): Promise<string> {
  const guard = Object.create(RateLimitGuard.prototype) as RateLimitGuard;
  const getTracker = RateLimitGuard.prototype["getTracker"] as (
    req: Record<string, any>,
  ) => Promise<string>;
  return getTracker.call(guard, req as Record<string, any>);
}

describe('RateLimitGuard.getTracker', () => {
  it('keys by user ID when request.user is present (authenticated)', async () => {
    const tracker = await callTracker({ user: { id: 'u-123' } });
    expect(tracker).toBe('user:u-123');
  });

  it('falls back to the first IP when request.ips is populated (proxy chain)', async () => {
    const tracker = await callTracker({ ips: ['10.0.0.1', '10.0.0.2'] });
    expect(tracker).toBe('10.0.0.1');
  });

  it('falls back to req.ip when no user and no ips', async () => {
    const tracker = await callTracker({ ip: '203.0.113.5' });
    expect(tracker).toBe('203.0.113.5');
  });

  it('uses "unknown" when nothing is available', async () => {
    const tracker = await callTracker({});
    expect(tracker).toBe('unknown');
  });

  it('does not key by user when user exists but has no id', async () => {
    const tracker = await callTracker({ user: {}, ip: '203.0.113.9' });
    expect(tracker).toBe('203.0.113.9');
  });
});
