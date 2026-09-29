import {
  createWorker,
  KvAnalyticsStorage,
} from "@riebeckite/analytics-cloudflare";

interface Env {
  ANALYTICS_KV: KVNamespace;
}

const cors = { allowedOrigins: ["https://www.example.com"] } as const;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return createWorker({
      storage: new KvAnalyticsStorage(env.ANALYTICS_KV),
      cors,
    }).fetch(request);
  },
};
