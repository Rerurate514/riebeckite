import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
  fingerprintExternalValue,
  type PluginDataHelper,
} from "@riebeckite/core";

export type {
  ArticlePostDiffProps,
  PostDiffProps,
} from "./components/post-diff.js";
export {
  ArticlePostDiffView,
  default as PostDiffView,
} from "./components/post-diff.js";
export { renderDiffHistory } from "./src/components/diff-history.js";
export { renderDiffLine } from "./src/components/diff-line.js";
export {
  renderDiffPanel,
  renderDiffViewer,
} from "./src/components/diff-viewer.js";

import { createLineDiff } from "./src/diff/line_diff.js";
import { GitMarkdownHistoryReader } from "./src/git/history_reader.js";
import type {
  DiffPluginUiOptions,
  DiffRevision,
  GitHistoryReaderOptions,
  MarkdownRevision,
  PostDiff,
  RevisionComparisonInput,
} from "./src/types.js";

export { createLineDiff } from "./src/diff/line_diff.js";
export { GitMarkdownHistoryReader } from "./src/git/history_reader.js";
export type {
  DiffLine,
  DiffLineType,
  DiffPluginUiOptions,
  DiffRevision,
  GitHistoryReaderOptions,
  MarkdownRevision,
  PostDiff,
  RevisionComparisonInput,
} from "./src/types.js";

export type DiffPluginOptions = GitHistoryReaderOptions & {
  ui?: DiffPluginUiOptions;
};

export type PostDiffApi = {
  getHistory(filePath: string): Promise<DiffRevision[]>;
  getRevisionMarkdown(filePath: string, hash: string): Promise<string | null>;
  getCurrentDiff(filePath: string): Promise<PostDiff | null>;
  compareRevisions(input: RevisionComparisonInput): Promise<PostDiff | null>;
};

export const getPostDiff: PluginDataHelper<
  { api: PostDiffApi; filePath: string },
  Promise<PostDiff | null>
> = ({ api, filePath }) => api.getCurrentDiff(filePath);

export function diff(options: DiffPluginOptions = {}) {
  const ui = { enabled: true, maxRevisions: 20, ...options.ui };
  let api: PostDiffApi | undefined;

  return definePlugin({
    name: "diff",
    order: 200,
    processedContentCache: {
      version: "diff-v3",
      dependencyMode: "unsafe",
    },
    contentOutputDependencies:
      ui.enabled === false
        ? []
        : [{ type: "external", id: "diff:git-history" }],
    resolveExternalDependencies: async (context) => {
      if (ui.enabled === false) return [];
      const reader = new GitMarkdownHistoryReader({
        ...options,
        cwd: options.cwd ?? context.config?.content.directory,
      });
      const state = await reader.getStateFingerprint();
      if (state === null) {
        return [
          {
            kind: "unavailable",
            failure: {
              id: "diff:git-history",
              reason: "Git history could not be fingerprinted.",
            },
          },
        ];
      }
      return [
        {
          kind: "resolved",
          snapshot: {
            id: "diff:git-history",
            fingerprint: fingerprintExternalValue(state),
            scope: { type: "content" },
            value: reader,
          },
        },
      ];
    },
    options,
    assets:
      ui.enabled === false
        ? []
        : [createStyleAsset("diff", "@riebeckite/plugin-diff/style.css")],
    clientEntries:
      ui.enabled === false
        ? []
        : [
            createClientEntry(
              "diff",
              "@riebeckite/plugin-diff/client",
              "initDiffHistory",
            ),
          ],
    onManifestCreated: async (context) => {
      if (ui.enabled === false) return;

      const snapshot = context.externalDependencies?.get("diff:git-history");
      if (!snapshot || !(snapshot.value instanceof GitMarkdownHistoryReader)) {
        return;
      }
      api ??= createPostDiffApiFromReader(snapshot.value);
      for (const entry of context.manifest.discoverableEntries) {
        const filePath = resolvePostFilePath({
          slug: entry.slug,
          contentIndex: context.contentIndex,
        });
        const history = (await api.getHistory(filePath)).slice(
          0,
          ui.maxRevisions,
        );
        const revisions = await getMarkdownRevisions(api, filePath, history);
        if (revisions.length === 0) continue;
        const selected = await api.getCurrentDiff(filePath);
        if (!selected) continue;

        const payloadPath = diffPayloadPath(entry.slug);
        context.output.emit({
          path: payloadPath,
          content: JSON.stringify({ revisions }).replace(/</g, "\\u003c"),
          dependencies: [
            { type: "content", slug: entry.slug },
            { type: "external", id: "diff:git-history" },
          ],
        });
      }
    },
  });
}

function diffPayloadPath(slug: string): string {
  return `_riebeckite/diff/${Buffer.from(slug).toString("base64url")}.json`;
}

export function createPostDiffApi(
  options: GitHistoryReaderOptions = {},
): PostDiffApi {
  return createPostDiffApiFromReader(new GitMarkdownHistoryReader(options));
}

function createPostDiffApiFromReader(
  reader: GitMarkdownHistoryReader,
): PostDiffApi {
  return {
    getHistory: (filePath) => reader.getHistory(filePath),
    getRevisionMarkdown: (filePath, hash) =>
      reader.getRevisionMarkdown(filePath, hash),
    getCurrentDiff: async (filePath) => {
      const history = await reader.getHistory(filePath);
      const [current, previous] = history;
      if (!current) return null;

      const toMarkdown = await reader.getRevisionMarkdown(
        filePath,
        current.hash,
      );
      if (toMarkdown === null) return null;

      const fromMarkdown = previous
        ? await reader.getRevisionMarkdown(filePath, previous.hash)
        : null;

      return buildPostDiff({
        from: previous ?? null,
        fromMarkdown,
        to: current,
        toMarkdown,
      });
    },
    compareRevisions: async (input) => {
      const history = await reader.getHistory(input.filePath);
      const from = history.find((revision) => revision.hash === input.fromHash);
      const to = history.find((revision) => revision.hash === input.toHash);
      if (!to) return null;

      const [fromMarkdown, toMarkdown] = await Promise.all([
        input.fromHash
          ? reader.getRevisionMarkdown(input.filePath, input.fromHash)
          : Promise.resolve(null),
        reader.getRevisionMarkdown(input.filePath, input.toHash),
      ]);
      if (toMarkdown === null) return null;

      return buildPostDiff({
        from: from ?? null,
        fromMarkdown,
        to,
        toMarkdown,
      });
    },
  };
}

async function getMarkdownRevisions(
  api: PostDiffApi,
  filePath: string,
  history: DiffRevision[],
): Promise<MarkdownRevision[]> {
  const revisions = await Promise.all(
    history.map(async (revision) => ({
      revision,
      markdown: await api.getRevisionMarkdown(filePath, revision.hash),
    })),
  );
  return revisions.flatMap(({ revision, markdown }) =>
    markdown === null ? [] : [{ ...revision, markdown }],
  );
}

function resolvePostFilePath(context: {
  slug: string;
  contentIndex: Map<string, string>;
}): string {
  const indexedPath = context.contentIndex.get(context.slug.toLowerCase());
  const contentPath = `${indexedPath ?? context.slug}.md`;
  return contentPath;
}

function buildPostDiff(input: {
  from: DiffRevision | null;
  fromMarkdown: string | null;
  to: DiffRevision;
  toMarkdown: string;
}): PostDiff {
  return {
    from: input.from,
    to: input.to,
    lines: createLineDiff(input.fromMarkdown ?? "", input.toMarkdown),
  };
}
