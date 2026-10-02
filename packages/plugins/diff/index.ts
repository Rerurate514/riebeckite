import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";

export { renderDiffHistory } from "./src/components/diff-history.js";
export { renderDiffLine } from "./src/components/diff-line.js";
export {
  renderDiffPanel,
  renderDiffViewer,
} from "./src/components/diff-viewer.js";

import { renderDiffHistory } from "./src/components/diff-history.js";
import { createLineDiff } from "./src/diff/line_diff.js";
import { GitMarkdownHistoryReader } from "./src/git/history_reader.js";
import type {
  DiffPluginUiOptions,
  DiffRevision,
  GitHistoryReaderOptions,
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

export function diff(options: DiffPluginOptions = {}) {
  const ui = { enabled: true, maxRevisions: 20, ...options.ui };
  // Created on the first post hook, where the build config is available: the
  // content directory is what locates Git, and the process working directory
  // is only a fallback for programmatic use.
  let api: PostDiffApi | undefined;

  return definePlugin({
    name: "diff",
    processedContentCache: {
      version: "diff-v1",
      dependencyMode: "unsafe",
    },
    options,
    assets: ui.enabled === false ? [] : [createStyleAsset("diff")],
    clientEntries:
      ui.enabled === false
        ? []
        : [createClientEntry("diff", "initDiffHistory")],
    onPostProcessed: async (context) => {
      if (ui.enabled === false) return;

      api ??= createPostDiffApi({
        ...options,
        cwd: options.cwd ?? context.config?.content.directory,
      });
      const filePath = resolvePostFilePath(context);
      const history = (await api.getHistory(filePath)).slice(
        0,
        ui.maxRevisions,
      );
      const diffs = await buildRevisionDiffs(api, filePath, history);

      context.content.html += renderDiffHistory({
        history,
        diffs,
      });
    },
  });
}

export function createPostDiffApi(
  options: GitHistoryReaderOptions = {},
): PostDiffApi {
  const reader = new GitMarkdownHistoryReader(options);

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

function getPreviousRevision(
  history: DiffRevision[],
  hash: string,
): DiffRevision | null {
  const index = history.findIndex((revision) => revision.hash === hash);
  return index >= 0 ? (history[index + 1] ?? null) : null;
}

async function buildRevisionDiffs(
  api: PostDiffApi,
  filePath: string,
  history: DiffRevision[],
): Promise<PostDiff[]> {
  const comparisons: RevisionComparisonInput[] = [];

  for (let toIndex = 0; toIndex < history.length; toIndex += 1) {
    const to = history[toIndex];
    const previous = getPreviousRevision(history, to.hash);
    comparisons.push({
      filePath,
      fromHash: previous?.hash ?? null,
      toHash: to.hash,
    });

    for (
      let fromIndex = toIndex + 2;
      fromIndex < history.length;
      fromIndex += 1
    ) {
      comparisons.push({
        filePath,
        fromHash: history[fromIndex].hash,
        toHash: to.hash,
      });
    }
  }

  const diffs = await Promise.all(
    comparisons.map((comparison) => api.compareRevisions(comparison)),
  );
  return diffs.filter((entry): entry is PostDiff => entry !== null);
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
