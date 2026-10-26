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

import {
  createPostDiffApiFromReader,
  getMarkdownRevisions,
  type PostDiffApi,
} from "./src/api.js";
import { GitMarkdownHistoryReader } from "./src/git/history_reader.js";
import type { DiffPluginOptions, PostDiff } from "./src/types.js";

export type { PostDiffApi } from "./src/api.js";
export { createPostDiffApi } from "./src/api.js";
export { createLineDiff } from "./src/diff/line_diff.js";
export { GitMarkdownHistoryReader } from "./src/git/history_reader.js";
export type {
  DiffLine,
  DiffLineType,
  DiffPluginOptions,
  DiffPluginUiOptions,
  DiffRevision,
  GitHistoryReaderOptions,
  MarkdownRevision,
  PostDiff,
  RevisionComparisonInput,
} from "./src/types.js";

export const getPostDiff: PluginDataHelper<
  { api: PostDiffApi; filePath: string },
  Promise<PostDiff | null>
> = ({ api, filePath }) => api.getCurrentDiff(filePath);

const manifestConcurrency = 12;

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
      const postDiffApi = (api ??= createPostDiffApiFromReader(snapshot.value));
      const entries = context.manifest.discoverableEntries;
      for (let index = 0; index < entries.length; index += manifestConcurrency) {
        const outputs = await Promise.all(
          entries.slice(index, index + manifestConcurrency).map(async (entry) => {
            const filePath = resolvePostFilePath({
              slug: entry.slug,
              contentIndex: context.contentIndex,
            });
            const history = (await postDiffApi.getHistory(filePath)).slice(
              0,
              ui.maxRevisions,
            );
            const revisions = await getMarkdownRevisions(
              postDiffApi,
              filePath,
              history,
            );
            if (revisions.length === 0) return undefined;
            const selected = await postDiffApi.getCurrentDiff(filePath);
            if (!selected) return undefined;

            return {
              path: diffPayloadPath(entry.slug),
              content: JSON.stringify({ revisions }).replace(/</g, "\\u003c"),
              dependencies: [
                { type: "content", slug: entry.slug },
                { type: "external", id: "diff:git-history" },
              ] as const,
            };
          }),
        );
        for (const output of outputs) {
          if (output) context.output.emit(output);
        }
      }
    },
  });
}

function diffPayloadPath(slug: string): string {
  return `_riebeckite/diff/${Buffer.from(slug).toString("base64url")}.json`;
}

function resolvePostFilePath(context: {
  slug: string;
  contentIndex: Map<string, string>;
}): string {
  const indexedPath = context.contentIndex.get(context.slug.toLowerCase());
  const contentPath = `${indexedPath ?? context.slug}.md`;
  return contentPath;
}
