import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import net from "node:net";
import test from "node:test";
import { waitForFirstResponse } from "../src/commands/dev_indicator.ts";

test("waitForFirstResponse resolves with the first response status", async () => {
  const server = http.createServer((_request, response) => {
    response.statusCode = 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  try {
    const response = await waitForFirstResponse(url, { retryDelayMs: 10 });
    assert.deepEqual(response, { url, status: 200 });
  } finally {
    server.close();
  }
});

test("waitForFirstResponse falls back to the other loopback family", async () => {
  const calls: string[] = [];
  const response = await waitForFirstResponse("http://localhost:5173/", {
    fetchImplementation: (async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url === "http://[::1]:5173/") return new Response("ok");
      throw new Error("ECONNREFUSED");
    }) as typeof fetch,
  });
  assert.deepEqual(response, { url: "http://localhost:5173/", status: 200 });
  assert.deepEqual(calls, [
    "http://localhost:5173/",
    "http://127.0.0.1:5173/",
    "http://[::1]:5173/",
  ]);
});

test("waitForFirstResponse retries until the server accepts connections", async () => {
  const server = http.createServer((_request, response) => {
    response.statusCode = 200;
    response.end();
  });
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/`;
  const started = performance.now();
  setTimeout(
    () =>
      new Promise<void>((resolve) =>
        server.listen(port, "127.0.0.1", () => resolve()),
      ),
    120,
  );
  try {
    const response = await waitForFirstResponse(url, { retryDelayMs: 20 });
    assert.equal(response?.status, 200);
    assert.equal(response?.url, url);
    assert.ok(performance.now() - started >= 100);
  } finally {
    server.close();
  }
});

test("waitForFirstResponse returns non-2xx responses without retrying", async () => {
  let calls = 0;
  const url = "http://127.0.0.1:5173/";
  const response = await waitForFirstResponse(url, {
    fetchImplementation: (async () => {
      calls += 1;
      return new Response("error", { status: 503 });
    }) as typeof fetch,
  });
  assert.deepEqual(response, { url, status: 503 });
  assert.equal(calls, 1);
});

test("waitForFirstResponse stops as soon as the caller aborts", async () => {
  const response = await waitForFirstResponse("http://127.0.0.1:9/", {
    retryDelayMs: 10,
    isAborted: () => true,
  });
  assert.equal(response, undefined);
});

test("waitForFirstResponse gives up after the timeout", async () => {
  const started = performance.now();
  const response = await waitForFirstResponse("http://127.0.0.1:9/", {
    timeoutMs: 120,
    retryDelayMs: 40,
  });
  assert.equal(response, undefined);
  assert.ok(performance.now() - started < 5_000);
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a port."));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}
