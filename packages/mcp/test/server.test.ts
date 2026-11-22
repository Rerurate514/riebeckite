import assert from "node:assert/strict";
import test from "node:test";
import { BridgeClient, searchOfficialPlugins } from "../src/server.js";

test("uses the authenticated bootstrap origin for Bridge requests", async () => {
  const originalFetch = globalThis.fetch;
  const requests: { url: string; headers: Headers }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    requests.push({ url, headers: new Headers(init?.headers) });
    return url.endsWith("/bootstrap")
      ? Response.json({ origin: "http://127.0.0.1:61345" })
      : Response.json({ protocolVersion: 1 });
  };
  try {
    const client = new BridgeClient({
      origin: "http://127.0.0.1:5173",
      token: "a".repeat(32),
    });
    assert.deepEqual(
      await client.get("/__riebeckite/bridge/v1/context", {
        path: "notes/hello.md",
      }),
      { protocolVersion: 1 },
    );
    assert.equal(
      requests[0].url,
      "http://127.0.0.1:5173/__riebeckite/bridge/bootstrap",
    );
    assert.equal(
      requests[1].url,
      "http://127.0.0.1:61345/__riebeckite/bridge/v1/context?path=notes%2Fhello.md",
    );
    assert.equal(
      requests[1].headers.get("x-riebeckite-bridge-token"),
      "a".repeat(32),
    );
    assert.equal(requests[1].headers.get("x-riebeckite-bridge-protocol"), "1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("plans and applies mutations with the mutation token", async () => {
  const originalFetch = globalThis.fetch;
  const requests: { url: string; headers: Headers; body?: string }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = input.toString();
    requests.push({
      url,
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    if (url.endsWith("/bootstrap")) {
      return Response.json({ origin: "http://127.0.0.1:61345" });
    }
    if (url.endsWith("/mutations/plan")) {
      return Response.json({ id: "plan-1" });
    }
    return Response.json({ applied: true });
  };
  try {
    const mutationToken = "m".repeat(32);
    const client = new BridgeClient({
      origin: "http://127.0.0.1:5173",
      token: "a".repeat(32),
      mutationToken,
    });
    assert.deepEqual(await client.planMutation([{ op: "update" }]), {
      id: "plan-1",
    });
    assert.deepEqual(await client.applyMutation("plan-1"), {
      applied: true,
    });
    assert.deepEqual(await client.inspectMutation("plan-1"), {
      applied: true,
    });
    assert.equal(
      requests[1].url,
      "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/plan",
    );
    assert.equal(
      requests[1].headers.get("x-riebeckite-bridge-mutation-token"),
      mutationToken,
    );
    assert.equal(
      requests[1].body,
      JSON.stringify({ operations: [{ op: "update" }] }),
    );
    const apply = requests.find((request) =>
      request.url.endsWith("/mutations/plan-1/apply"),
    );
    assert.equal(
      apply?.url,
      "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/plan-1/apply",
    );
    assert.equal(apply?.body, "{}");
    const inspect = requests.find((request) =>
      request.url.endsWith("/mutations/plan-1"),
    );
    assert.equal(
      inspect?.url,
      "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/plan-1",
    );
    assert.equal(
      inspect?.headers.get("x-riebeckite-bridge-mutation-token"),
      mutationToken,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requires a mutation token for mutation plans", async () => {
  const client = new BridgeClient({
    origin: "http://127.0.0.1:5173",
    token: "a".repeat(32),
  });
  await assert.rejects(
    client.planMutation([]),
    /RIEBECKITE_BRIDGE_MUTATION_TOKEN/,
  );
});

test("searches the npm registry for official plugins", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  globalThis.fetch = async (input) => {
    requestUrl = input.toString();
    return Response.json({
      objects: [
        {
          package: {
            name: "@riebeckite/plugin-search",
            version: "0.1.0",
            description: "Search",
          },
        },
        {
          package: {
            name: "@other/plugin-search",
            version: "1.0.0",
          },
        },
      ],
    });
  };
  try {
    assert.deepEqual(await searchOfficialPlugins("search", 10), {
      source: "npm registry",
      query: "search",
      plugins: [
        {
          name: "@riebeckite/plugin-search",
          version: "0.1.0",
          description: "Search",
        },
      ],
    });
    assert.equal(
      requestUrl,
      "https://registry.npmjs.org/-/v1/search?text=%40riebeckite%2Fplugin-search&size=10",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
