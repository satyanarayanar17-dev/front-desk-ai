import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
import { Route } from '@/routes/api/public/webhooks/vapi';
const post = (Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
afterEach(() => vi.unstubAllEnvs());
describe('Legacy webhook authentication', () => {
 it('rejects writes when no secret is configured', async () => {
  vi.stubEnv('VAPI_WEBHOOK_SECRET', '');
  expect((await post({request:new Request('https://example.invalid', {method:'POST',body:'{}'})})).status).toBe(503);
 });
 it('rejects an incorrect secret before reading or writing any call data', async () => {
  vi.stubEnv('VAPI_WEBHOOK_SECRET', 'synthetic-test-secret');
  expect((await post({request:new Request('https://example.invalid', {method:'POST',headers:{'x-vapi-secret':'incorrect'},body:'{}'})})).status).toBe(401);
 });
});
