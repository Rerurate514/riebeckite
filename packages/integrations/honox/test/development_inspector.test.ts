import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { ContentManager, resolveConfig } from "@riebeckite/core";
import { FileSystemContentSource } from "@riebeckite/node";
import { markdown, withTemporaryDirectory } from "@riebeckite/test";
import type { ViteDevServer } from "vite";
import { riebeckiteDevelopmentInspector } from "../src/development_inspector.js";
import { createDevelopmentTrace } from "../src/development_trace.js";

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
    let manifestHookRuns = 0;
    const config = resolveConfig({
      site: { title: "Test", locale: "en" },
      plugins: [
        {
          name: "manifest-counter",
          onManifestCreated() {
            manifestHookRuns += 1;
          },
        },
        {
          name: "disabled-plugin",
          enabled: false,
          onManifestCreated() {
            throw new Error("disabled plugin must not run");
          },
        },
      ],
    });
    const trace = createDevelopmentTrace();
    const content = new ContentManager(
      new FileSystemContentSource(contentRoot),
      [],
      {
        config,
        commitBuildState: false,
        observability: trace.observability,
        traceRecorder: trace,
      },
    );
    await content.getOutputChangeSet();
    assert.equal(manifestHookRuns, 1);
    const completed = content.getCompletedBuildSnapshot();
    assert.ok(completed);
    assert.ok(completed.completedAt > 0);
    assert.ok(completed.startedAt > 0);
    assert.ok(completed.startedAt <= completed.completedAt);
    assert.ok(Object.isFrozen(completed));
    assert.ok(Object.isFrozen(completed.plugins));
    assert.ok(completed.plugins.every((plugin) => Object.isFrozen(plugin)));
    assert.ok(Object.isFrozen(completed.manifestHookMetrics));
    assert.ok(Object.isFrozen(completed.trace?.spans));
    assert.ok(Object.isFrozen(completed.trace?.events));
    assert.ok(completed.trace?.spans.every((span) => Object.isFrozen(span)));
    assert.ok(completed.trace?.events.every((event) => Object.isFrozen(event)));
    assert.ok((completed.trace?.spans.length ?? 0) > 0);
    assert.ok(Object.isFrozen(completed.outputChangeSet));
    assert.ok(Object.isFrozen(completed.outputChangeSet.affected));
    assert.ok(
      completed.outputChangeSet.affected.every((output) =>
        Object.isFrozen(output.dependencies),
      ),
    );
    assert.deepEqual(
      await content.getOutputChangeSet(),
      completed.outputChangeSet,
    );
    const plugin = riebeckiteDevelopmentInspector(() => ({
      config,
      configRoot: directory,
      configFile: path.join(directory, "riebeckite.config.ts"),
      appRoot: directory,
      contentRoot,
    }));
    const stack = inspectorStack(plugin, content);
    const { response, body } = await requestReport(stack[0]?.handle);

    assert.equal(response.statusCode, 200);
    const report = JSON.parse(body);
    assert.equal(report.output, undefined);
    assert.equal(report.dependencies, undefined);
    assert.deepEqual(report.plugins, [
      { name: "manifest-counter", order: 1, enabled: true },
    ]);
    assert.equal(report.themeConfig.name, report.theme);
    assert.equal(report.themeConfig.colorMode, "system");

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
    assert.equal(output.regeneration.status, "available");
    assert.equal(
      output.regeneration.required,
      output.regeneration.reasons.length > 0,
    );
    assert.ok(Array.isArray(output.output.unchanged));
    assert.ok(output.output.affectedOutputCount >= 1);
    assert.ok(output.dependencies.dependencyCount >= 1);
    assert.ok(
      output.regeneration.reasons.length > 0 ||
        output.regeneration.unknown.length > 0,
    );
    const filtered = await requestReport(
      outputHandle,
      "/__riebeckite/inspector/output?limit=1&status=affected",
    );
    const filteredOutput = JSON.parse(filtered.body);
    assert.ok(filteredOutput.output.affected.length <= 1);
    assert.equal(typeof filteredOutput.output.hiddenAffectedCount, "number");
    const dependencies = await requestReport(
      outputHandle,
      "/__riebeckite/inspector/output?dlimit=1&dq=index",
    );
    assert.ok(JSON.parse(dependencies.body).dependencies.outputs.length <= 1);
    const lookup = await requestReport(
      outputHandle,
      "/__riebeckite/inspector/output?output=index.html",
    );
    const lookupBody = JSON.parse(lookup.body);
    assert.equal(lookupBody.output.lookups.output.status, "found");
    assert.ok(
      lookupBody.output.lookups.output.dependencies.includes("content:index"),
    );
    const changed = await requestReport(
      outputHandle,
      "/__riebeckite/inspector/output?changed=index",
    );
    assert.ok(JSON.parse(changed.body).output.lookups.changed.outputCount >= 1);

    const graphHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/graph",
    )?.handle;
    const graphResponse = await requestReport(graphHandle);
    const graph = JSON.parse(graphResponse.body).graph;
    assert.equal(graph.status, "available");
    assert.equal(
      graph.summary.affectedOutputCount,
      output.output.affectedOutputCount,
    );
    assert.equal(
      graph.summary.removedOutputCount,
      output.output.removedOutputCount,
    );
    assert.ok(
      graph.nodes.some(
        (node: { id: string }) => node.id === "output:index.html",
      ),
    );
    const selectedGraph = JSON.parse(
      (
        await requestReport(
          graphHandle,
          "/__riebeckite/inspector/graph?node=content%3Aindex",
        )
      ).body,
    ).graph;
    assert.equal(selectedGraph.selected.id, "content:index");
    assert.ok(
      selectedGraph.nodes.some(
        (node: { id: string }) => node.id === "output:index.html",
      ),
    );
    assert.ok(
      selectedGraph.edges.some(
        (edge: { from: string; to: string }) =>
          edge.from === "content:index" && edge.to === "output:index.html",
      ),
    );
    const searchedGraph = JSON.parse(
      (
        await requestReport(
          graphHandle,
          "/__riebeckite/inspector/graph?q=index&limit=1",
        )
      ).body,
    ).graph;
    assert.ok(searchedGraph.search);
    assert.ok(searchedGraph.nodes.length <= 1);

    const pluginsHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/plugins",
    )?.handle;
    const pluginResponse = await requestReport(pluginsHandle);
    const execution = JSON.parse(pluginResponse.body).pluginExecution;
    assert.equal(execution.status, "available");
    assert.equal(execution.plugins[0].name, "manifest-counter");
    assert.equal(execution.plugins[0].order, 1);
    assert.equal(execution.plugins[1].name, "disabled-plugin");
    assert.equal(execution.plugins[1].enabled, false);
    assert.ok(execution.plugins[0].hookCount >= 1);
    assert.ok(
      execution.hooks.some(
        (hook: { plugin: string; hook: string; count: number }) =>
          hook.plugin === "manifest-counter" &&
          hook.hook === "onManifestCreated" &&
          hook.count === 1,
      ),
    );
    assert.equal(execution.trace.status, "available");
    assert.ok(execution.trace.wallClockMs > 0);
    assert.equal(manifestHookRuns, 1);
    await assert.rejects(
      fs.access(path.join(contentRoot, ".riebeckite", "content-state.json")),
    );
  });
});

test("development inspector rejects non-loopback hosts", async () => {
  const plugin = riebeckiteDevelopmentInspector(() => undefined as never);
  const stack = inspectorStack(plugin);
  const { response } = await requestReport(
    stack[0]?.handle,
    "/__riebeckite/inspector/report?path=%2F",
    "example.test:5199",
  );
  assert.equal(response.statusCode, 403);
});

test("development inspector reports unavailable before the development build exists", async () => {
  await withTemporaryDirectory(async (directory) => {
    const plugin = riebeckiteDevelopmentInspector(() => ({
      config: resolveConfig({ site: { title: "Test", locale: "en" } }),
      configRoot: directory,
      configFile: path.join(directory, "riebeckite.config.ts"),
      appRoot: directory,
      contentRoot: path.join(directory, "content"),
    }));
    const stack = inspectorStack(plugin);
    const outputHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/output",
    )?.handle;
    const response = await requestReport(outputHandle);

    assert.equal(response.response.statusCode, 200);
    assert.equal(JSON.parse(response.body).output.status, "unavailable");
    const graphHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/graph",
    )?.handle;
    assert.equal(
      JSON.parse((await requestReport(graphHandle)).body).graph.status,
      "unavailable",
    );
    const pluginsHandle = stack.find(
      (layer) => layer.route === "/__riebeckite/inspector/plugins",
    )?.handle;
    assert.equal(
      JSON.parse((await requestReport(pluginsHandle)).body).pluginExecution
        .status,
      "unavailable",
    );
  });
});

test("development inspector consumes failed snapshots and recovers", async () => {
  await withTemporaryDirectory(async (directory) => {
    let fail = true;
    let loads = 0;
    const rejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);
    try {
      const application = {
        config: resolveConfig({ site: { title: "Test", locale: "en" } }),
        configRoot: directory,
        configFile: path.join(directory, "riebeckite.config.ts"),
        appRoot: directory,
        contentRoot: path.join(directory, "content"),
      };
      const plugin = riebeckiteDevelopmentInspector(() => application);
      const stack = inspectorStack(
        plugin,
        Object.create(null) as ContentManager,
        async () => {
          loads += 1;
          if (fail) throw new Error("SSR module failed");
          return { content: undefined };
        },
      );

      const outputHandle = stack.find(
        (layer) => layer.route === "/__riebeckite/inspector/output",
      )?.handle;
      const graphHandle = stack.find(
        (layer) => layer.route === "/__riebeckite/inspector/graph",
      )?.handle;
      const pluginsHandle = stack.find(
        (layer) => layer.route === "/__riebeckite/inspector/plugins",
      )?.handle;
      const failed = await Promise.all([
        requestReport(stack[0]?.handle),
        requestReport(outputHandle),
        requestReport(graphHandle),
        requestReport(pluginsHandle),
      ]);
      assert.deepEqual(
        failed.map(({ response }) => response.statusCode),
        [500, 500, 500, 500],
      );
      assert.deepEqual(
        failed.map(({ body }) => JSON.parse(body).code),
        [
          "INSPECTOR_REPORT_FAILED",
          "INSPECTOR_OUTPUT_FAILED",
          "INSPECTOR_GRAPH_FAILED",
          "INSPECTOR_PLUGINS_FAILED",
        ],
      );
      assert.equal(loads, 1);
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.deepEqual(rejections, []);

      fail = false;
      const recovered = await Promise.all([
        requestReport(stack[0]?.handle),
        requestReport(outputHandle),
        requestReport(graphHandle),
        requestReport(pluginsHandle),
      ]);
      assert.deepEqual(
        recovered.map(({ response }) => response.statusCode),
        [200, 200, 200, 200],
      );
      assert.equal(loads, 2);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
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
  assert.match(source as string, /if \(!panel\?\.isConnected\)/);
  assert.match(source as string, /pendingRefresh/);
  assert.match(source as string, /clearInterval\(loadingTimer\)/);
  assert.match(source as string, /Dependencies/);
  assert.match(source as string, /Output/);
  assert.match(source as string, /report\.dependencies/);
  assert.match(source as string, /report\.output/);
  assert.match(source as string, /report\.regeneration/);
  assert.match(source as string, /loadOutput/);
  assert.match(source as string, /reportEndpoint/);
  assert.match(source as string, /outputEndpoint/);
  assert.match(source as string, /Loading output plan/);
  assert.match(source as string, /Loading dependencies/);
  assert.match(source as string, /fullRegenerationRequired/);
  assert.match(source as string, /dependencyCount/);
  assert.match(source as string, /dependentOutputCount/);
  assert.match(source as string, /diagnosticQuery/);
  assert.match(source as string, /diagnosticSeverity/);
  assert.match(source as string, /diagnosticCategory/);
  assert.match(source as string, /diagnosticCode/);
  assert.match(source as string, /data-focus-key/);
  assert.match(source as string, /Current-page filtering is unavailable/);
  assert.match(source as string, /<details/);
  assert.match(source as string, /data-resize/);
  assert.match(source as string, /data-output-page/);
  assert.match(source as string, /lookups/);
  assert.match(source as string, /dependency-kind/);
  assert.match(source as string, /plugin\.order/);
  assert.match(source as string, /graphEndpoint/);
  assert.match(source as string, /data-graph-query/);
  assert.match(source as string, /data-graph-selected/);
  assert.match(
    source as string,
    /WikiLink content links are a different graph/,
  );
  assert.match(source as string, /pluginsEndpoint/);
  assert.match(source as string, /data-plugin-query/);
  assert.match(source as string, /cumulative span durations/);
  assert.match(source as string, /cache\.bypass/);
  assert.match(source as string, /data-theme-query/);
  assert.match(source as string, /collectThemeTokens/);
  assert.match(source as string, /--\(rb\|rr\)-/);
});

function inspectorStack(
  plugin: ReturnType<typeof riebeckiteDevelopmentInspector>,
  content?: ContentManager,
  loadModule: () => Promise<{ content?: ContentManager }> = async () => ({
    content,
  }),
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
    watcher: {
      on() {},
      off() {},
    },
    httpServer: {
      address: () => ({ address: "127.0.0.1" }),
      once() {},
    },
    environments: {
      ssr: {
        moduleGraph: {
          getModuleById() {
            return content ? Object.create(null) : undefined;
          },
        },
      },
    },
    ssrLoadModule: loadModule,
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
  host = "127.0.0.1:4173",
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
  await handle({ headers: { host }, url }, response);
  return { response, headers, body };
}

function hookHandler<Handler extends (...arguments_: never[]) => unknown>(
  hook: Handler | { readonly handler: Handler } | undefined,
): Handler {
  assert.ok(hook);
  return typeof hook === "function" ? hook : hook.handler;
}
