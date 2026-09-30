import {
  createWorker,
  D1AnalyticsRateLimiter,
  D1AnalyticsStorage,
} from "@riebeckite/analytics-cloudflare";

interface Env {
  ANALYTICS_DB: D1Database;
}

const cors = { allowedOrigins: ["https://www.example.com"] } as const;

// Best-effort mitigation for forged page views; not authentication.
const rateLimit = { maxRequests: 60, windowMs: 60_000 } as const;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createWorker({
      storage: new D1AnalyticsStorage(env.ANALYTICS_DB),
      rateLimit: new D1AnalyticsRateLimiter(env.ANALYTICS_DB, rateLimit),
      cors,
    }).fetch(request);
  },
};
