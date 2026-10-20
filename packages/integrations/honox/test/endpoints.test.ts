import assert from "node:assert/strict";
import test from "node:test";
import type {
  ContentManager,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { mountRiebeckiteEndpoints } from "../src/endpoints.ts";

test("an endpoint without a manifest does not initialize content", async () => {
  let handler: ((context: never) => Promise<unknown>) | undefined;
  let manifestRequests = 0;
  mountRiebeckiteEndpoints(
    {
      get: (_path, registered) => {
        handler = registered as typeof handler;
      },
      post: () => {},
    },
    {
      config: {
        plugins: [
          {
            name: "static-endpoint",
            endpoints: [
              {
                path: "/robots.txt",
                requiresManifest: false,
                handler: () => ({ body: "User-agent: *" }),
              },
            ],
          },
        ],
      } as unknown as ResolvedRiebeckiteConfig,
      content: {
        getManifest: async () => {
          manifestRequests += 1;
          throw new Error("The manifest must not be requested.");
        },
      } as unknown as ContentManager,
    },
  );

  const response = await handler?.({
    req: {
      method: "GET",
      url: "http://localhost/robots.txt",
      path: "/robots.txt",
      raw: { headers: { forEach: () => {} } },
      query: () => ({}),
      text: async () => "",
    },
    body: (body: string) => body,
    json: () => "",
    text: (body: string) => body,
  } as never);

  assert.equal(response, "User-agent: *");
  assert.equal(manifestRequests, 0);
});
