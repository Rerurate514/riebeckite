import assert from "node:assert/strict";
import test from "node:test";
import { riebeckiteDevelopmentInspector } from "../src/development_inspector.js";

test("development inspector prioritizes its endpoint and keeps failures private", async () => {
  const stack: Array<{ route: string; handle: Function }> = [];
  const plugin = riebeckiteDevelopmentInspector(() => {
    throw new Error("C:\\private\\secret-token");
  });
  const configure = plugin.configureServer as (server: any) => (() => void) | void;
  const afterConfigure = configure({
    middlewares: {
      stack,
      use(route: string, handle: Function) {
        stack.push({ route, handle });
      },
    },
    httpServer: { address: () => ({ address: "127.0.0.1" }) },
  });
  stack.unshift({ route: "", handle() {} });
  if (typeof afterConfigure === "function") afterConfigure();

  assert.equal(stack[0]?.route, "/__riebeckite/inspector/report");

  const headers = new Map<string, string>();
  let body = "";
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
    end(value?: string) {
      body = value ?? "";
    },
  };
  await stack[0]?.handle(
    { headers: { host: "127.0.0.1:4173" }, url: "/__riebeckite/inspector/report?path=%2Fthemes" },
    response,
  );

  assert.equal(response.statusCode, 500);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(body), { code: "INSPECTOR_REPORT_FAILED" });
  assert.doesNotMatch(body, /secret-token|private/);
});

test("development inspector client provides accessible panels and safe refreshes", () => {
  const plugin = riebeckiteDevelopmentInspector(() => undefined as never);
  const load = hookHandler(plugin.load);
  const source = Reflect.apply(load, undefined, [
    "\0virtual:riebeckite/development-inspector",
  ]);

  assert.equal(typeof source, "string");
  assert.match(source as string, /AbortController/);
  assert.match(source as string, /riebeckite:inspector/);
  assert.match(source as string, /aria-controls/);
  assert.match(source as string, /Ctrl\+Alt\+R/);
  assert.match(source as string, /Dependencies/);
  assert.match(source as string, /Output/);
});

function hookHandler<Handler extends (...arguments_: never[]) => unknown>(
  hook: Handler | { readonly handler: Handler } | undefined,
): Handler {
  assert.ok(hook);
  return typeof hook === "function" ? hook : hook.handler;
}
