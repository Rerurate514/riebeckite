import assert from "node:assert/strict";
import { type TestContext, test } from "node:test";
import {
  createWebmentionSourceFetcher,
  isDisallowedHostname,
  isDisallowedIpAddress,
  type WebmentionHostResolver,
} from "../src/verify.js";

const SOURCE_URL = "https://source.example/entry";
const TARGET_LINK_HTML =
  '<!doctype html><html><body><a href="https://target.example/post/">reply</a></body></html>';

/** Resolves every host to a fixed public address, keeping tests offline. */
const publicResolver: WebmentionHostResolver = async () => ["93.184.216.34"];

type FetchHandler = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function installFetch(t: TestContext, handler: FetchHandler): string[] {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input, init) => {
    calls.push(String(input));
    return handler(input, init);
  }) as typeof globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function redirectResponse(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } });
}

test("fetches an HTML source from a public host", async (t) => {
  const calls = installFetch(t, async () => htmlResponse(TARGET_LINK_HTML));
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  const result = await fetcher(SOURCE_URL);

  assert.equal(result?.html, TARGET_LINK_HTML);
  assert.equal(result?.url, SOURCE_URL);
  assert.equal(calls.length, 1);
});

test("follows a redirect to another public host", async (t) => {
  const calls = installFetch(t, async (input) =>
    String(input) === SOURCE_URL
      ? redirectResponse("https://cdn.example/final")
      : htmlResponse(TARGET_LINK_HTML),
  );
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  const result = await fetcher(SOURCE_URL);

  assert.equal(result?.html, TARGET_LINK_HTML);
  assert.equal(result?.url, "https://cdn.example/final");
  assert.equal(calls.length, 2);
});

test("rejects a redirect to a loopback host before fetching it", async (t) => {
  const calls = installFetch(t, async () =>
    redirectResponse("http://127.0.0.1/secret"),
  );
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(calls.length, 1);
});

test("rejects a redirect to the cloud metadata address", async (t) => {
  const calls = installFetch(t, async () =>
    redirectResponse("http://169.254.169.254/latest/meta-data/"),
  );
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(calls.length, 1);
});

test("rejects a redirect whose host resolves to a private address", async (t) => {
  const resolver: WebmentionHostResolver = async (hostname) =>
    hostname === "internal.example" ? ["10.0.0.5"] : ["93.184.216.34"];
  const calls = installFetch(t, async (input) =>
    String(input) === SOURCE_URL
      ? redirectResponse("http://internal.example/secret")
      : htmlResponse("<p>secret</p>"),
  );
  const fetcher = createWebmentionSourceFetcher({ resolveHostname: resolver });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(calls.length, 1);
});

test("rejects a source whose own host resolves to a private address", async (t) => {
  const calls = installFetch(t, async () => htmlResponse(TARGET_LINK_HTML));
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: async () => ["192.168.1.10"],
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(calls.length, 0);
});

test("stops reading a body that exceeds maxBytes and cancels it", async (t) => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(64));
    },
    cancel() {
      cancelled = true;
    },
  });
  installFetch(
    t,
    async () =>
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
  );
  const fetcher = createWebmentionSourceFetcher({
    maxBytes: 16,
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(cancelled, true);
});

test("rejects an oversized declared Content-Length without reading", async (t) => {
  let read = false;
  const response = {
    status: 200,
    ok: true,
    url: "",
    headers: new Headers({
      "content-type": "text/html",
      "content-length": "2000000",
    }),
    body: null,
    async text() {
      read = true;
      return "";
    },
  };
  installFetch(t, async () => response as unknown as Response);
  const fetcher = createWebmentionSourceFetcher({
    maxBytes: 1000,
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.equal(read, false);
});

test("rejects a non-HTML response", async (t) => {
  installFetch(
    t,
    async () =>
      new Response("{}", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
});

test("gives up after too many redirects", async (t) => {
  const calls = installFetch(t, async () =>
    redirectResponse("https://source.example/entry"),
  );
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: publicResolver,
  });

  assert.equal(await fetcher(SOURCE_URL), null);
  assert.ok(calls.length >= 2 && calls.length <= 12);
});

test("allows private hosts when allowPrivateHosts is set", async (t) => {
  const calls = installFetch(t, async () => htmlResponse(TARGET_LINK_HTML));
  const fetcher = createWebmentionSourceFetcher({
    resolveHostname: async () => ["127.0.0.1"],
    allowPrivateHosts: true,
  });

  const result = await fetcher("http://localhost/entry");

  assert.equal(result?.html, TARGET_LINK_HTML);
  assert.equal(calls.length, 1);
});

test("classifies reserved IP ranges as disallowed", () => {
  const disallowed = [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.0.2.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "fec0::1",
    "ff02::1",
    "2001:db8::1",
    "2002::1",
    "64:ff9b::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
  ];
  for (const address of disallowed) {
    assert.equal(isDisallowedIpAddress(address), true, address);
  }

  const allowed = [
    "93.184.216.34",
    "8.8.8.8",
    "172.32.0.1",
    "2606:4700::1111",
    "2001:4860:4860::8888",
  ];
  for (const address of allowed) {
    assert.equal(isDisallowedIpAddress(address), false, address);
  }
});

test("rejects local hostnames and accepts public names", () => {
  const disallowed = [
    "localhost",
    "foo.localhost",
    "LOCALHOST.",
    "127.0.0.1",
    "[::1]",
    "10.0.0.1",
  ];
  for (const host of disallowed) {
    assert.equal(isDisallowedHostname(host), true, host);
  }

  const allowed = ["example.com", "source.example", "[2606:4700::1111]"];
  for (const host of allowed) {
    assert.equal(isDisallowedHostname(host), false, host);
  }
});
