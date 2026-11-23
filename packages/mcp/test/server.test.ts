import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  BridgeClient,
  createServer,
  searchOfficialPlugins,
} from "../src/server.js";

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

test("registers and dispatches the Bridge MCP tools", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = input.toString();
    requests.push(url);
    return url.endsWith("/bootstrap")
      ? Response.json({ origin: "http://127.0.0.1:61345" })
      : Response.json({ ok: true });
  };
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer(
    new BridgeClient({
      origin: "http://127.0.0.1:5173",
      token: "a".repeat(32),
      mutationToken: "m".repeat(32),
    }),
  );
  const client = new Client({ name: "test", version: "1.0.0" });
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 14);
    await client.callTool({ name: "riebeckite_status", arguments: {} });
    await client.callTool({
      name: "riebeckite_context",
      arguments: { path: "notes/hello.md" },
    });
    await client.callTool({
      name: "riebeckite_validate_mutation",
      arguments: { operations: [{ op: "update" }] },
    });
    await client.callTool({
      name: "riebeckite_mutation_plan",
      arguments: { operations: [{ op: "update" }] },
    });
    await client.callTool({
      name: "riebeckite_mutation_apply",
      arguments: { planId: "plan-1" },
    });
    await client.callTool({
      name: "riebeckite_mutation_inspect",
      arguments: { planId: "00000000-0000-4000-8000-000000000001" },
    });
    assert.deepEqual(
      requests.filter((url) => !url.endsWith("/bootstrap")),
      [
        "http://127.0.0.1:61345/__riebeckite/bridge/v1",
        "http://127.0.0.1:61345/__riebeckite/bridge/v1/context?path=notes%2Fhello.md",
        "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/validate",
        "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/plan",
        "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/plan-1/apply",
        "http://127.0.0.1:61345/__riebeckite/bridge/v1/mutations/00000000-0000-4000-8000-000000000001",
      ],
    );
  } finally {
    await client.close();
    await server.close();
    globalThis.fetch = originalFetch;
  }
});
