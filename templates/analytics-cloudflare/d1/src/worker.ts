import {
  createWorker,
  D1AnalyticsStorage,
} from "@riebeckite/analytics-cloudflare";

interface Env {
  ANALYTICS_DB: D1Database;
}

const cors = { allowedOrigins: ["https://www.example.com"] } as const;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createWorker({
      storage: new D1AnalyticsStorage(env.ANALYTICS_DB),
      cors,
    }).fetch(request);
  },
};
