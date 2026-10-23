import {
  attachmentUrl,
  type ContentManifest,
  type ContentSource,
  escapeHtml,
  escapeHtmlAttribute,
  getExtension,
  type PluginPage,
  type PluginPageContext,
  type PluginRenderContext,
  readContentSourceEntry,
} from "@riebeckite/core";
import type { SourceFilesOptions } from "../index.js";

const DEFAULT_MAX_BYTES = 1024 * 1024;
const SECRET_NAMES = new Set(["id_rsa", "credentials"]);
const SECRET_EXTENSIONS = new Set(["key", "pem", "p12", "pfx"]);

export async function renderSourceEmbed(
  context: PluginRenderContext,
  options: SourceFilesOptions,
): Promise<string | null> {
  if (context.kind !== "attachment" || !isSelectedPath(context.path, options)) {
    return null;
  }
  const source = await readSource(context.contentSource, context.path, options);
  if (!source) return null;
  const label = context.label || fileName(context.path);
  const href = `${sourceFilePath(context.path)}${context.fragment ? `#${encodeURIComponent(context.fragment)}` : ""}`;
  if (!context.embed) {
    return `<a class="rr-obsidian-wikilink rr-source-files__link" href="${escapeHtmlAttribute(href)}">${escapeHtml(label)}</a>`;
  }
  const code = selectLines(source.text, context.fragment);
  return `<section class="rr-source-file-embed" data-source-file="${escapeHtmlAttribute(context.path)}"><a class="rr-source-file-embed__title" href="${escapeHtmlAttribute(href)}">${escapeHtml(label)}</a>${renderCode(code, context.path)}</section>`;
}

export async function listSourceFiles(
  manifest: ContentManifest,
  contentSource: ContentSource | undefined,
  options: SourceFilesOptions,
): Promise<readonly string[]> {
  const linked = new Set<string>();
  for (const entry of manifest.publicEntries) {
    for (const link of entry.links) {
      if (
        link.kind === "attachment" &&
        link.slug &&
        isSelectedPath(link.slug, options)
      ) {
        linked.add(link.slug);
      }
    }
  }
  const readable = await Promise.all(
    [...linked]
      .sort()
      .map(async (path) =>
        (await readSource(contentSource, path, options)) ? path : null,
      ),
  );
  return readable.flatMap((path) => (path ? [sourceFilePath(path)] : []));
}

export async function resolveSourcePage(
  context: PluginPageContext,
  options: SourceFilesOptions,
): Promise<PluginPage | null> {
  const sourcePath = resolveSourcePath(
    context.pathname,
    context.manifest,
    options,
  );
  if (!sourcePath) return null;
  const source = await readSource(context.contentSource, sourcePath, options);
  if (!source) return null;
  const title = fileName(sourcePath);
  const markdown = `\`\`\`${languageFor(sourcePath)} title="source-file:${title.replaceAll('"', "'")}"\n${source.text}\n\`\`\``;
  const code = await context.renderMarkdown(markdown);
  return {
    type: "source-file",
    pathname: context.pathname,
    title,
    body: `<main class="rr-source-file" data-source-file="${escapeHtmlAttribute(sourcePath)}"><header class="rr-source-file__header"><h1>${escapeHtml(title)}</h1><p class="rr-source-file__path">${escapeHtml(sourcePath)}</p><dl class="rr-source-file__metadata"><div><dt>Language</dt><dd>${escapeHtml(languageFor(sourcePath))}</dd></div><div><dt>Size</dt><dd>${escapeHtml(formatBytes(source.bytes))}</dd></div></dl><a class="rr-source-file__download" href="${escapeHtmlAttribute(attachmentUrl(sourcePath))}" download>Download source file</a></header>${code}</main>`,
  };
}

export function sourceFilePath(path: string): string {
  return `/source/${path.split("/").map(encodeURIComponent).join("/")}/`;
}

export function resolveSourcePath(
  pathname: string,
  manifest: ContentManifest,
  options: SourceFilesOptions,
): string | null {
  for (const entry of manifest.publicEntries) {
    for (const link of entry.links) {
      if (
        link.kind === "attachment" &&
        link.slug &&
        sourceFilePath(link.slug) === pathname &&
        isSelectedPath(link.slug, options)
      ) {
        return link.slug;
      }
    }
  }
  return null;
}

async function readSource(
  contentSource: ContentSource | undefined,
  path: string,
  options: SourceFilesOptions,
): Promise<{ readonly text: string; readonly bytes: number } | null> {
  if (!contentSource || !isSelectedPath(path, options)) return null;
  try {
    const content = await readContentSourceEntry(contentSource, path);
    if (content === null) return null;
    const bytes =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    if (
      bytes.byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES) ||
      bytes.includes(0)
    )
      return null;
    const text =
      typeof content === "string"
        ? content
        : new TextDecoder("utf-8", { fatal: true }).decode(content);
    return { text, bytes: bytes.byteLength };
  } catch {
    return null;
  }
}

function isSelectedPath(path: string, options: SourceFilesOptions): boolean {
  if (!isSafePath(path) || isSecretPath(path)) return false;
  return (
    matchesAny(path, options.include) &&
    !matchesAny(path, options.exclude ?? [])
  );
}

function isSafePath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes("\0") &&
    path
      .split("/")
      .every((part) => part !== "" && part !== "." && part !== "..")
  );
}

function isSecretPath(path: string): boolean {
  const name = fileName(path).toLowerCase();
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    SECRET_NAMES.has(name) ||
    SECRET_EXTENSIONS.has(getExtension(path))
  );
}

function matchesAny(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) =>
    new RegExp(
      `^${pattern
        .split("**")
        .map((part) => part.split("*").map(escapeRegex).join("[^/]*"))
        .join(".*")}$`,
      "i",
    ).test(path),
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function renderCode(text: string, path: string): string {
  return `<pre><code class="language-${escapeHtmlAttribute(languageFor(path))}">${escapeHtml(text)}</code></pre>`;
}

function selectLines(text: string, fragment: string | undefined): string {
  const match = fragment?.match(/^L(\d+)(?:-L(\d+))?$/i);
  if (!match) return text;
  const start = Number(match[1]);
  const end = Number(match[2] ?? match[1]);
  if (start < 1 || end < start) return text;
  return text
    .split("\n")
    .slice(start - 1, end)
    .join("\n");
}

function languageFor(path: string): string {
  const extension = getExtension(path);
  return extension === "" ? "text" : extension;
}

function fileName(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
