import fs from "node:fs/promises";
import path from "node:path";

export async function createSite(siteRoot, size) {
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
    `import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { ContentManager, NoopLogger, SinkTracer } from "@riebeckite/core";
import { FileSystemContentSource } from "@riebeckite/node";
import { config } from "./config";
const traceFile = process.env.RIEBECKITE_BENCH_TRACE_FILE;
if (traceFile) {
  mkdirSync(dirname(traceFile), { recursive: true });
  rmSync(traceFile, { force: true });
}
const tracer = new SinkTracer({
  onSpan: (span) => {
    if (traceFile) appendFileSync(traceFile, JSON.stringify({ type: "span", name: span.name, durationMs: span.durationMs }) + "\\n");
  },
  onEvent: (event) => {
    if (traceFile) appendFileSync(traceFile, JSON.stringify({ type: "event", name: event.name, attributes: event.attributes }) + "\\n");
  },
});
export const content = new ContentManager(new FileSystemContentSource(config.content.directory, config.content.exclude), [], { config, plugins: config.plugins, observability: { logger: new NoopLogger(), tracer } });
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
