import { createOnlineHandler } from '../../integration/online-handler.mjs';

export default async function handler(request) {
  return createOnlineHandler(process.env)(request);
}

export const config = {
  path: '/api/*',
  rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 40 },
};
