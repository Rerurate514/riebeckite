import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const appRequire = createRequire(
  path.join(root, "apps", "web", "package.json"),
);
const { build, defineConfig } = await import(
  pathToFileURL(appRequire.resolve("vite")).href
);
const { default: honox } = await import(
  pathToFileURL(appRequire.resolve("honox/vite")).href
);
const { default: viteBuild } = await import(
  pathToFileURL(
    path.join(
      root,
      "apps",
      "web",
      "node_modules",
      "@hono",
      "vite-build",
      "dist",
      "adapter",
      "node",
      "index.mjs",
    ),
  ).href
);
const { riebeckiteVite } = await import(
  pathToFileURL(
    path.join(root, "packages", "integrations", "honox", "dist", "index.js"),
  ).href
);
const workRoot = path.join(
  root,
  "apps",
  "web",
  ".riebeckite",
  "ssg-large-vault-benchmark",
);
const sizes = parseList(process.env.RIEBECKITE_BENCH_SIZES ?? "1000,10000").map(
  Number,
);
const scenarios = new Set(
  parseList(process.env.RIEBECKITE_BENCH_SCENARIOS ?? ""),
);
const repeatCount = Number(process.env.RIEBECKITE_BENCH_REPEATS ?? "3");

if (process.env.RIEBECKITE_BENCH_BUILD_ONCE) {
  const input = JSON.parse(process.env.RIEBECKITE_BENCH_BUILD_ONCE);
  console.log(JSON.stringify(await runBuild(input.siteRoot, input.scenario)));
  process.exit(0);
}

for (const size of sizes) {
  const samples = [];
  for (let runIndex = 0; runIndex < repeatCount; runIndex++) {
    const siteRoot = path.join(
      workRoot,
      String(size),
      String(runIndex),
      "site",
    );
    await fs.rm(path.dirname(siteRoot), { recursive: true, force: true });
    await createSite(siteRoot, size);
    if (shouldRun("cold")) {
      samples.push(await measure(siteRoot, "cold"));
    }
    if (shouldRun("no-change")) {
      await measure(siteRoot, "no-change baseline");
      samples.push(await measure(siteRoot, "no-change"));
    }
    if (shouldRun("single-edit")) {
      await measure(siteRoot, "single-edit baseline");
      await fs.appendFile(
        path.join(siteRoot, "vault", notePath(size - 1)),
        "\nIndependent edit.\n",
        "utf8",
      );
      samples.push(await measure(siteRoot, "single-edit"));
    }
  }
  for (const scenario of ["cold", "no-change", "single-edit"]) {
    const scenarioSamples = samples.filter(
      (sample) => sample.scenario === scenario,
    );
    if (scenarioSamples.length > 0)
      console.log(
        JSON.stringify({ size, ...summarize(scenario, scenarioSamples) }),
      );
  }
}

function shouldRun(name) {
  return scenarios.size === 0 || scenarios.has(name);
}

async function measure(siteRoot, scenario) {
  const { stdout } = await execFileAsync(
    process.execPath,
    [fileURLToPath(import.meta.url)],
    {
      env: {
        ...process.env,
        RIEBECKITE_BENCH_BUILD_ONCE: JSON.stringify({ siteRoot, scenario }),
      },
      maxBuffer: 1024 * 1024 * 32,
    },
  );
  return JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
}

async function runBuild(siteRoot, scenario) {
  const metricsFile = path.join(
    siteRoot,
    ".riebeckite",
    `${scenario}.ssg.json`,
  );
  process.env.RIEBECKITE_SSG_METRICS_FILE = metricsFile;
  process.env.RIEBECKITE_APP_ROOT = siteRoot;
  const memorySamples = [];
  const sampler = setInterval(
    () => memorySamples.push(process.memoryUsage()),
    100,
  );
  const start = performance.now();
  await build(
    defineConfig({
      root: siteRoot,
      resolve: {
        alias: {
          "@riebeckite/honox/server": path.join(
            root,
            "packages",
            "integrations",
            "honox",
            "dist",
            "server.js",
          ),
          "@riebeckite/honox": path.join(
            root,
            "packages",
            "integrations",
            "honox",
            "dist",
            "index.js",
          ),
          "@riebeckite/core": path.join(
            root,
            "packages",
            "core",
            "dist",
            "index.js",
          ),
        },
      },
      plugins: [
        honox({ client: { input: ["/app/client.ts"] } }),
        ...riebeckiteVite(),
        viteBuild(),
      ],
      logLevel: "silent",
    }),
  );
  clearInterval(sampler);
  memorySamples.push(process.memoryUsage());
  const wallClockMs = Math.round(performance.now() - start);
  const ssgMetrics = JSON.parse(await fs.readFile(metricsFile, "utf8"));
  return {
    scenario,
    wallClockMs,
    peakRssMb: toMb(Math.max(...memorySamples.map((sample) => sample.rss))),
    peakHeapUsedMb: toMb(
      Math.max(...memorySamples.map((sample) => sample.heapUsed)),
    ),
    ...ssgMetrics,
  };
}

async function createSite(siteRoot, size) {
  await fs.mkdir(path.join(siteRoot, "app", "routes"), { recursive: true });
  await fs.writeFile(
    path.join(siteRoot, "package.json"),
    JSON.stringify({ type: "module", private: true }),
  );
  await fs.writeFile(path.join(siteRoot, "app", "client.ts"), "");
  await fs.writeFile(
    path.join(siteRoot, "riebeckite.config.ts"),
    `import { defineConfig } from "@riebeckite/core";
export default defineConfig({ site: { title: "Benchmark" }, content: { directory: ${JSON.stringify(path.join(siteRoot, "vault"))}, filters: { publishStrategy: "selective" } }, cache: { enabled: true, directory: ${JSON.stringify(path.join(siteRoot, ".riebeckite", "cache"))} } });
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "config.ts"),
    `import { defineConfig, resolveConfig } from "@riebeckite/core";
export const config = resolveConfig(defineConfig({ site: { title: "Benchmark" }, content: { directory: ${JSON.stringify(path.join(siteRoot, "vault"))}, filters: { publishStrategy: "selective" } }, cache: { enabled: true, directory: ${JSON.stringify(path.join(siteRoot, ".riebeckite", "cache"))} } }));
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "content.ts"),
    `import { ContentManager } from "@riebeckite/core";
import { config } from "./config";
export const content = new ContentManager(config.content.directory, config.content.exclude, { config, plugins: config.plugins });
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "server.ts"),
    `import { Hono } from "hono";
import { ssgParams } from "hono/ssg";
import { resolveRiebeckiteRoute, riebeckiteSsgParams } from "@riebeckite/honox/server";
import { content } from "./content";
import { config } from "./config";
const app = new Hono();
app.get("/", (c) => c.html("<main>Benchmark</main>"));
app.get(
  "/:slug{.+}",
  ssgParams(() => riebeckiteSsgParams(content)),
  async (c) => {
    const route = await resolveRiebeckiteRoute(content, c.req.path);
    if (!route || route.kind !== "content") return c.notFound();
    const post = await content.getProcessedContent(route.entry.slug);
    return c.html(\`<article>\${post.html}</article>\`);
  },
);
export default app;
export { config, content };
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "routes", "_renderer.tsx"),
    `import { jsxRenderer } from "hono/jsx-renderer";
export default jsxRenderer(({ children }) => <html><body>{children}</body></html>);
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "routes", "index.tsx"),
    `import { createRoute } from "honox/factory";
export default createRoute((c) => c.render(<main>Benchmark</main>));
`,
  );
  await fs.writeFile(
    path.join(siteRoot, "app", "routes", "[slug{.+}].tsx"),
    `import { resolveRiebeckiteRoute, riebeckiteSsgParams } from "@riebeckite/honox/server";
import { ssgParams } from "hono/ssg";
import { createRoute } from "honox/factory";
import { content } from "../content";
export default createRoute(
  ssgParams(() => riebeckiteSsgParams(content)),
  async (c) => {
    const route = await resolveRiebeckiteRoute(content, c.req.path);
    if (!route || route.kind !== "content") return c.notFound();
    const post = await content.getProcessedContent(route.entry.slug);
    return c.render(<article dangerouslySetInnerHTML={{ __html: post.html }} />);
  },
);
`,
  );
  await generateVault(path.join(siteRoot, "vault"), size);
}

async function generateVault(directory, size) {
  for (let index = 0; index < size; index++) await writeNote(directory, index);
}

async function writeNote(directory, index) {
  const file = path.join(directory, notePath(index));
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tags = [`tag${index % 20}`, `group${index % 7}`];
  const markdown = [
    "---",
    `title: Note ${index}`,
    "visibility: public",
    `tags: [${tags.map((tag) => `"${tag}"`).join(", ")}]`,
    "---",
    "",
    `# Note ${index}`,
    "",
    `This is deterministic content for note ${index}.`,
    index > 0 && index % 3 === 0 ? `[[${slugPath(index - 1)}]]` : "",
    "",
  ].join("\n");
  await fs.writeFile(file, markdown, "utf8");
}

function notePath(index) {
  return `${slugPath(index)}.md`;
}

function slugPath(index) {
  const section = String(Math.floor(index / 100)).padStart(3, "0");
  return `notes/section-${section}/note-${String(index).padStart(5, "0")}`;
}

function parseList(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function summarize(scenario, samples) {
  const values = samples.map((sample) => sample.wallClockMs);
  return {
    scenario,
    runs: samples.length,
    wallClockMs: median(values),
    wallClockMsMin: Math.min(...values),
    wallClockMsMax: Math.max(...values),
    samples,
  };
}

function median(values) {
  return [...values].sort((left, right) => left - right)[
    Math.floor(values.length / 2)
  ];
}

function toMb(bytes) {
  return Math.round(bytes / 1024 / 1024);
}
