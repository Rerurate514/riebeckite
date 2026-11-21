import assert from "node:assert/strict";
import test from "node:test";
import { BridgeClient } from "../src/server.js";

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
