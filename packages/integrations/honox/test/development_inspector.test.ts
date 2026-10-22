import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { resolveConfig } from "@riebeckite/core";
import { markdown, withTemporaryDirectory } from "@riebeckite/test";
import type { ViteDevServer } from "vite";
import { riebeckiteDevelopmentInspector } from "../src/development_inspector.js";

type Middleware = (
  request: { headers: { host?: string }; url?: string },
  response: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(value?: string): void;
  },
) => void | Promise<void>;

test("development inspector prioritizes its endpoint and keeps failures private", async () => {
  const plugin = riebeckiteDevelopmentInspector(() => {
    throw new Error("C:\\private\\secret-token");
  });
  const stack = inspectorStack(plugin);
  const { response, headers, body } = await requestReport(stack[0]?.handle);

  assert.equal(response.statusCode, 500);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(body), { code: "INSPECTOR_REPORT_FAILED" });
  assert.doesNotMatch(body, /secret-token|private/);
});

test("development inspector reports the output plan and dependencies", async () => {
  await withTemporaryDirectory(async (directory) => {
    const contentRoot = path.join(directory, "content");
    await fs.mkdir(contentRoot, { recursive: true });
    await fs.writeFile(
      path.join(contentRoot, "index.md"),
      markdown("# Home", { title: "Home", visibility: "public" }),
    );
    const plugin = riebeckiteDevelopmentInspector(() => ({
      config: resolveConfig({ site: { title: "Test", locale: "en" } }),
      configRoot: directory,
      configFile: path.join(directory, "riebeckite.config.ts"),
      appRoot: directory,
      contentRoot,
    }));
    const stack = inspectorStack(plugin);
    const { response, body } = await requestReport(stack[0]?.handle);

    assert.equal(response.statusCode, 200);
    const report = JSON.parse(body);
    assert.equal(report.output, undefined);
    assert.equal(report.dependencies, undefined);

    const outputHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/output",
    )?.handle;
    const outputResponse = await requestReport(
      outputHandle,
      "/__riebeckite/inspector/output",
    );
    assert.equal(outputResponse.response.statusCode, 200);
    const output = JSON.parse(outputResponse.body);
    assert.equal(output.output.status, "available");
    assert.equal(output.dependencies.status, "available");
    assert.ok(output.output.affectedOutputCount >= 1);
    assert.ok(output.dependencies.dependencyCount >= 1);
    await assert.rejects(
      fs.access(path.join(contentRoot, ".riebeckite", "content-state.json")),
    );
  });
});

test("development inspector shares one report across concurrent requests", async () => {
  await withTemporaryDirectory(async (directory) => {
    const contentRoot = path.join(directory, "content");
    await fs.mkdir(contentRoot, { recursive: true });
    await fs.writeFile(
      path.join(contentRoot, "index.md"),
      markdown("# Home", { title: "Home", visibility: "public" }),
    );
    const plugin = riebeckiteDevelopmentInspector(() => ({
      config: resolveConfig({ site: { title: "Test", locale: "en" } }),
      configRoot: directory,
      configFile: path.join(directory, "riebeckite.config.ts"),
      appRoot: directory,
      contentRoot,
    }));
    const stack = inspectorStack(plugin);
    const [first, second] = await Promise.all([
      requestReport(
        stack[0]?.handle,
        "/__riebeckite/inspector/report?path=%2F",
      ),
      requestReport(
        stack[0]?.handle,
        "/__riebeckite/inspector/report?path=%2Fthemes",
      ),
    ]);

    assert.equal(first.response.statusCode, 200);
    assert.equal(second.response.statusCode, 200);
    const firstReport = JSON.parse(first.body);
    const secondReport = JSON.parse(second.body);
    assert.equal(firstReport.currentPage, "/");
    assert.equal(secondReport.currentPage, "/themes");

    const outputHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/output",
    )?.handle;
    const [firstOutput, secondOutput] = await Promise.all([
      requestReport(outputHandle, "/__riebeckite/inspector/output"),
      requestReport(outputHandle, "/__riebeckite/inspector/output"),
    ]);
    assert.deepEqual(
      JSON.parse(firstOutput.body).output,
      JSON.parse(secondOutput.body).output,
    );
  });
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
  assert.match(source as string, /Loading inspector report/);
  assert.match(source as string, /if \(!panel\.isConnected\)/);
  assert.match(source as string, /pendingRefresh/);
  assert.match(source as string, /clearInterval\(loadingTimer\)/);
  assert.match(source as string, /Dependencies/);
  assert.match(source as string, /Output/);
  assert.match(source as string, /report\.dependencies/);
  assert.match(source as string, /report\.output/);
  assert.match(source as string, /loadOutput/);
  assert.match(source as string, /reportEndpoint/);
  assert.match(source as string, /outputEndpoint/);
  assert.match(source as string, /Loading output plan/);
  assert.match(source as string, /Loading dependencies/);
  assert.match(source as string, /loading output plan/);
  assert.match(source as string, /fullRegenerationRequired/);
  assert.match(source as string, /dependencyCount/);
  assert.match(source as string, /dependentOutputCount/);
});

function inspectorStack(
  plugin: ReturnType<typeof riebeckiteDevelopmentInspector>,
): Array<{ route: string; handle: Middleware }> {
  const stack: Array<{ route: string; handle: Middleware }> = [];
  const configure = plugin.configureServer;
  if (typeof configure !== "function") {
    throw new Error("Expected configureServer function hook");
  }
  const server: ViteDevServer = Object.create(null);
  Object.assign(server, {
    middlewares: {
      stack,
      use(route: string, handle: Middleware) {
        stack.push({ route, handle });
      },
    },
    httpServer: { address: () => ({ address: "127.0.0.1" }) },
  });
  const afterConfigure = Reflect.apply(configure, undefined, [server]);
  stack.unshift({ route: "", handle() {} });
  if (typeof afterConfigure === "function") afterConfigure();
  assert.equal(stack[0]?.route, "/__riebeckite/inspector/report");
  return stack;
}

async function requestReport(
  handle: Middleware | undefined,
  url = "/__riebeckite/inspector/report?path=%2Fthemes",
): Promise<{
  response: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(value?: string): void;
  };
  headers: Map<string, string>;
  body: string;
}> {
  assert.ok(handle);
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
  await handle({ headers: { host: "127.0.0.1:4173" }, url }, response);
  return { response, headers, body };
}

function hookHandler<Handler extends (...arguments_: never[]) => unknown>(
  hook: Handler | { readonly handler: Handler } | undefined,
): Handler {
  assert.ok(hook);
  return typeof hook === "function" ? hook : hook.handler;
}
