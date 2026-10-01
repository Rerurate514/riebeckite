import type { Diagnostic } from "@riebeckite/core";
import type {
  Heading,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  Text,
} from "mdast";
import { visit } from "unist-util-visit";
import { parseBibliography } from "./bibliography.js";
import type {
  BibliographyEntry,
  CachedBibliography,
  CitationOccurrence,
  CitationReference,
  ParsedBibliography,
  RemarkCitationsOptions,
} from "./types.js";

type Tree = {
  type?: string;
  children?: unknown[];
  value?: string;
  name?: string;
  attributes?: Record<string, unknown>;
};
type Parent = { children?: unknown[]; type?: string };
type MarkdownFile = { data?: Record<string, unknown> };

/**
 * Ancestors whose descendants must never be rewritten: citations inside a link
 * would emit nested `<a>` elements, and code/frontmatter must stay verbatim.
 */
const BLOCKING_ANCESTORS = new Set([
  "link",
  "linkReference",
  "definition",
  "inlineCode",
  "code",
  "html",
  "yaml",
  "toml",
]);

export function remarkCitations(options: RemarkCitationsOptions) {
  return async (tree: Root, file: MarkdownFile) => {
    const blocked = new WeakSet<object>();
    prepareTree(tree, blocked);

    const paths = bibliographyPathGroups(options, readFrontmatter(file));
    const bibliography = await loadBibliographies(paths, options);
    const context = createRenderContext(options, bibliography.entries);

    visit(
      tree,
      "text",
      (node: Text, index: number | undefined, parent: Parent) => {
        if (index === undefined || !parent.children) return;
        if (blocked.has(node)) return;
        const replacement = transformTextNode(node, context);
        if (replacement.length === 1 && replacement[0] === node) return;
        parent.children.splice(index, 1, ...replacement);
        return index + replacement.length;
      },
    );

    if (context.orderedKeys.length > 0) {
      tree.children.push(createReferencesHeading(options.referencesHeading));
      tree.children.push(createReferencesList(context));
    }
  };
}

function readFrontmatter(
  file: MarkdownFile,
): Record<string, unknown> | undefined {
  const matter = file.data?.matter;
  return typeof matter === "object" && matter !== null
    ? (matter as Record<string, unknown>)
    : undefined;
}

/**
 * Marks text that must not be rewritten and repairs citation keys that
 * `remark-directive` split at a `:`, which happens before this plugin runs.
 */
function prepareTree(root: Root, blocked: WeakSet<object>): void {
  prepareNode(root as unknown as Tree, blocked, false);
}

function prepareNode(
  node: Tree,
  blocked: WeakSet<object>,
  insideBlocked: boolean,
): void {
  const children = node.children;
  if (!children) return;
  const isBlocked =
    insideBlocked ||
    (node.type !== undefined && BLOCKING_ANCESTORS.has(node.type));
  if (!isBlocked) repairSplitCitations(children);

  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const candidate = child as Tree;
    if (candidate.type === "text") {
      if (isBlocked) blocked.add(candidate);
      continue;
    }
    prepareNode(candidate, blocked, isBlocked);
  }
}

function repairSplitCitations(children: unknown[]): void {
  for (let index = 1; index < children.length; index += 1) {
    const node = children[index] as Tree | undefined;
    if (node?.type !== "textDirective") continue;

    const previous = children[index - 1] as Tree | undefined;
    if (previous?.type !== "text" || typeof previous.value !== "string") {
      continue;
    }
    if (Array.isArray(node.children) && node.children.length > 0) continue;
    if (node.attributes && Object.keys(node.attributes).length > 0) continue;

    const junction = previous.value.length;
    const following = children[index + 1] as Tree | undefined;
    const followingValue =
      following?.type === "text" && typeof following.value === "string"
        ? following.value
        : "";
    const merged = `${previous.value}:${node.name ?? ""}${followingValue}`;
    if (!spansCitation(merged, junction)) continue;

    previous.value = merged;
    if (followingValue) children.splice(index + 1, 1);
    children.splice(index, 1);
    index -= 1;
  }
}

function spansCitation(value: string, junction: number): boolean {
  return findCitations(value).some(
    (match) => match.start < junction && match.end > junction,
  );
}

function bibliographyPathGroups(
  options: RemarkCitationsOptions,
  frontmatter: Record<string, unknown> | undefined,
): readonly (readonly string[])[] {
  if (frontmatter?.bibliography !== undefined) {
    return pathList(frontmatter.bibliography).map((path) =>
      pageRelativeCandidates(path, options.sourceSlug),
    );
  }
  return pathList(options.bibliography).map((path) => [path]);
}

function pathList(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * Frontmatter paths are document-relative first, then content-root relative.
 * Every candidate still goes through `ContentSource.scan()`, so no candidate can
 * escape the configured content root.
 */
function pageRelativeCandidates(
  path: string,
  sourceSlug: string | undefined,
): readonly string[] {
  const normalized = normalizeLogicalPath(path);
  if (!sourceSlug || isAbsoluteLikePath(normalized)) return [normalized];

  const directory = normalizeLogicalPath(sourceSlug)
    .split("/")
    .slice(0, -1)
    .join("/");
  if (!directory) return [normalized];

  const relative = normalizeLogicalPath(`${directory}/${normalized}`);
  return relative === normalized ? [normalized] : [relative, normalized];
}

function isAbsoluteLikePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

function normalizeLogicalPath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (parts.length > 0 && parts.at(-1) !== "..") parts.pop();
      else parts.push(segment);
      continue;
    }
    parts.push(segment);
  }
  const prefix = path.startsWith("/") ? "/" : "";
  return `${prefix}${parts.join("/")}`;
}

async function loadBibliographies(
  pathGroups: readonly (readonly string[])[],
  options: RemarkCitationsOptions,
): Promise<ParsedBibliography> {
  const entries = new Map<string, BibliographyEntry>();
  const diagnostics: Diagnostic[] = [];

  for (const candidates of pathGroups) {
    const resolved = await loadFirstAvailable(candidates, options);
    if (!resolved) {
      diagnostics.push({
        code: "citation-missing-bibliography",
        severity: "error",
        message: `Bibliography file was not found: ${candidates[0] ?? ""}`,
        filePath: candidates[0],
      });
      continue;
    }

    diagnostics.push(...resolved.parsed.diagnostics);
    for (const [key, entry] of resolved.parsed.entries) {
      if (entries.has(key)) {
        diagnostics.push({
          code: "citation-duplicate-key",
          severity: "warning",
          message: `Duplicate bibliography key: ${key}`,
          filePath: resolved.path,
          target: key,
        });
      } else {
        entries.set(key, entry);
      }
    }
  }

  pushUniqueDiagnostics(options.diagnostics, diagnostics, options.sourceSlug);
  return { entries, diagnostics };
}

async function loadFirstAvailable(
  candidates: readonly string[],
  options: RemarkCitationsOptions,
): Promise<{ path: string; parsed: ParsedBibliography } | null> {
  for (const path of candidates) {
    const resolved = await cachedBibliography(path, options);
    if (resolved.found) return { path, parsed: resolved.parsed };
  }
  return null;
}

async function cachedBibliography(
  path: string,
  options: RemarkCitationsOptions,
): Promise<CachedBibliography> {
  const cached = options.cache.get(path);
  if (cached) return cached;

  const promise = (async (): Promise<CachedBibliography> => {
    const source = await options.loadBibliography(path);
    if (source === null) {
      return {
        found: false,
        parsed: { entries: new Map(), diagnostics: [] },
      };
    }
    return { found: true, parsed: parseBibliography(source, path) };
  })();

  options.cache.set(path, promise);
  return promise;
}

type RenderContext = {
  readonly entries: ReadonlyMap<string, BibliographyEntry>;
  readonly numbers: Map<string, number>;
  readonly orderedKeys: string[];
  readonly referenceIds: Map<string, string>;
  readonly usedReferenceIds: Set<string>;
  readonly occurrences: CitationOccurrence[];
  readonly options: RemarkCitationsOptions;
};

function createRenderContext(
  options: RemarkCitationsOptions,
  entries: ReadonlyMap<string, BibliographyEntry>,
): RenderContext {
  return {
    entries,
    numbers: new Map(),
    orderedKeys: [],
    referenceIds: new Map(),
    usedReferenceIds: new Set(),
    occurrences: [],
    options,
  };
}

function transformTextNode(node: Text, context: RenderContext): unknown[] {
  const segments: unknown[] = [];
  let cursor = 0;
  for (const match of findCitations(node.value)) {
    if (match.start > cursor)
      segments.push({
        type: "text",
        value: node.value.slice(cursor, match.start),
      });
    segments.push(renderCitation(match.references, match.bracketed, context));
    cursor = match.end;
  }
  if (segments.length === 0) return [node];
  if (cursor < node.value.length)
    segments.push({ type: "text", value: node.value.slice(cursor) });
  return segments;
}

type CitationMatch = {
  readonly start: number;
  readonly end: number;
  readonly references: readonly CitationReference[];
  readonly bracketed: boolean;
};

function findCitations(value: string): CitationMatch[] {
  const matches: CitationMatch[] = [];
  const ignoredRanges = findWikiLinkRanges(value);
  const bracketPattern = /\[([^\]]*@[-A-Za-z0-9_:.]+[^\]]*)\]/g;
  for (const match of value.matchAll(bracketPattern)) {
    if (
      value[match.index - 1] === "[" ||
      value[match.index + match[0].length] === "]"
    ) {
      continue;
    }
    if (
      rangeOverlaps(ignoredRanges, match.index, match.index + match[0].length)
    )
      continue;
    const references = parseBracketCitation(match[1]);
    if (references.length === 0) continue;
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      references,
      bracketed: true,
    });
  }
  const inlinePattern = /(^|[\s(])@([-A-Za-z0-9_:.]+)(?=\b)/g;
  for (const match of value.matchAll(inlinePattern)) {
    const start = match.index + match[1].length;
    if (rangeOverlaps(ignoredRanges, start, start + match[2].length + 1))
      continue;
    if (overlaps(matches, start, start + match[2].length + 1)) continue;
    matches.push({
      start,
      end: start + match[2].length + 1,
      bracketed: false,
      references: [{ key: match[2], suppressAuthor: false }],
    });
  }
  return matches.toSorted((a, b) => a.start - b.start);
}

function findWikiLinkRanges(
  value: string,
): readonly { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /\[\[[\s\S]*?\]\]/g;
  for (const match of value.matchAll(pattern)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

function rangeOverlaps(
  ranges: readonly { start: number; end: number }[],
  start: number,
  end: number,
): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}

function parseBracketCitation(input: string): CitationReference[] {
  return input
    .split(";")
    .map((part) => parseCitationPart(part.trim()))
    .filter((part): part is CitationReference => Boolean(part));
}

function parseCitationPart(part: string): CitationReference | null {
  const match =
    /^(?<prefix>.*?)\s*(?<suppress>-?)@(?<key>[-A-Za-z0-9_:.]+)(?<suffix>.*)$/.exec(
      part,
    );
  if (!match?.groups) return null;
  return {
    key: match.groups.key,
    prefix: match.groups.prefix.trim() || undefined,
    suffix: match.groups.suffix.trim() || undefined,
    suppressAuthor: match.groups.suppress === "-",
  };
}

function overlaps(
  matches: readonly CitationMatch[],
  start: number,
  end: number,
): boolean {
  return matches.some((match) => start < match.end && end > match.start);
}

function renderCitation(
  references: readonly CitationReference[],
  bracketed: boolean,
  context: RenderContext,
): Link {
  const renderedReferences = references.map((reference) =>
    renderCitationReference(reference, context),
  );
  const separator = renderedReferences.some((item) => item.hasAffix)
    ? "; "
    : ", ";
  const text = renderedReferences.map((item) => item.text).join(separator);
  const label = bracketed ? `[${text}]` : text;

  const occurrenceId =
    `citation-${context.options.sourceSlug ?? "page"}-${context.occurrences.length + 1}`.replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    );
  context.occurrences.push({
    id: occurrenceId,
    pageSlug: context.options.sourceSlug,
    references,
    label,
    syntax: bracketed
      ? references.some((item) => item.suppressAuthor)
        ? "suppress-author"
        : "bracket"
      : "inline",
  });

  return {
    type: "link",
    url: `#${referenceId(references[0]?.key ?? "unknown", context)}`,
    title: null,
    children: [{ type: "text", value: label }],
  };
}

function renderCitationReference(
  reference: CitationReference,
  context: RenderContext,
): { text: string; hasAffix: boolean } {
  const number = numberForReference(reference, context).toString();
  return {
    text: citationReferenceText(reference.prefix, number, reference.suffix),
    hasAffix: Boolean(reference.prefix || reference.suffix),
  };
}

function citationReferenceText(
  prefix: string | undefined,
  number: string,
  suffix: string | undefined,
): string {
  const withPrefix = prefix ? `${prefix} ${number}` : number;
  if (!suffix) return withPrefix;
  return /^[,.;:)]/.test(suffix)
    ? `${withPrefix}${suffix}`
    : `${withPrefix} ${suffix}`;
}

function numberForReference(
  reference: CitationReference,
  context: RenderContext,
): number {
  const existing = context.numbers.get(reference.key);
  if (existing) return existing;

  const number = context.orderedKeys.length + 1;
  context.numbers.set(reference.key, number);
  context.orderedKeys.push(reference.key);
  referenceId(reference.key, context);

  if (!context.entries.has(reference.key)) {
    pushUniqueDiagnostics(
      context.options.diagnostics,
      [
        {
          code: "citation-unknown-key",
          severity: "warning",
          message: `Unknown citation key: ${reference.key}`,
          slug: context.options.sourceSlug,
          target: reference.key,
        },
      ],
      context.options.sourceSlug,
    );
  }
  return number;
}

/**
 * Anchors stay inside `[A-Za-z0-9_-]` so they are valid HTML ids, valid CSS
 * identifiers, percent-decoding free (fragment == id) and injection free.
 * Colliding sanitizations get a deterministic numeric suffix.
 */
function referenceId(key: string, context: RenderContext): string {
  const existing = context.referenceIds.get(key);
  if (existing) return existing;

  const sanitized = key
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = `ref-${sanitized || "key"}`;
  let id = base;
  let counter = 2;
  while (context.usedReferenceIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  context.referenceIds.set(key, id);
  context.usedReferenceIds.add(id);
  return id;
}

function createReferencesHeading(text = "References"): Heading {
  return {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: text }],
  };
}

function createReferencesList(context: RenderContext): List {
  return {
    type: "list",
    ordered: true,
    start: 1,
    spread: false,
    children: context.orderedKeys.map(
      (key): ListItem => ({
        type: "listItem",
        spread: false,
        data: { hProperties: { id: referenceId(key, context) } },
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: renderBibliographyEntry(context.entries.get(key), key),
              },
            ],
          } satisfies Paragraph,
        ],
      }),
    ),
  };
}

function renderBibliographyEntry(
  entry: BibliographyEntry | undefined,
  key: string,
): string {
  if (!entry) return key;
  const author = entry.fields.author ?? entry.fields.editor;
  const year = entry.fields.year ?? entry.fields.date;
  const title = entry.fields.title;
  const container =
    entry.fields.journal ?? entry.fields.booktitle ?? entry.fields.publisher;
  return [author, year ? `(${year})` : undefined, title, container]
    .filter(Boolean)
    .join(". ");
}

function pushUniqueDiagnostics(
  target: Diagnostic[],
  diagnostics: readonly Diagnostic[],
  slug: string | undefined,
): void {
  for (const diagnostic of diagnostics) {
    const next = diagnostic.slug ? diagnostic : { ...diagnostic, slug };
    const signature = diagnosticSignature(next);
    if (target.some((item) => diagnosticSignature(item) === signature))
      continue;
    target.push(next);
  }
}

function diagnosticSignature(diagnostic: Diagnostic): string {
  return `${diagnostic.code}:${diagnostic.slug ?? ""}:${diagnostic.filePath ?? ""}:${diagnostic.target ?? ""}:${diagnostic.message}`;
}
