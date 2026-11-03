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

test("rejects endpoint request bodies above the size limit", async () => {
  let handler: ((context: never) => Promise<unknown>) | undefined;
  let endpointCalled = false;
  mountRiebeckiteEndpoints(
    {
      get: () => {},
      post: (_path, registered) => {
        handler = registered as typeof handler;
      },
    },
    {
      config: {
        plugins: [
          {
            name: "upload-endpoint",
            endpoints: [
              {
                path: "/upload",
                method: "POST",
                requiresManifest: false,
                handler: () => {
                  endpointCalled = true;
                  return { body: "ok" };
                },
              },
            ],
          },
        ],
      } as unknown as ResolvedRiebeckiteConfig,
      content: {} as ContentManager,
    },
  );

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(1024 * 1024 + 1));
      controller.close();
    },
  });
  const response = (await handler?.({
    req: {
      method: "POST",
      url: "http://localhost/upload",
      path: "/upload",
      raw: { headers: { forEach: () => {} }, body },
      query: () => ({}),
      text: async () => "",
    },
    body: (value: string) => value,
    json: () => "",
    text: (value: string, status?: number) => ({ value, status }),
  } as never)) as { status?: number } | undefined;

  assert.equal(response?.status, 413);
  assert.equal(endpointCalled, false);
});
