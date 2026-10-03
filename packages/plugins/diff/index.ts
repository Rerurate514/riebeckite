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

export function diff(options: DiffPluginOptions = {}) {
  const ui = { enabled: true, maxRevisions: 20, ...options.ui };
  // Created on the first post hook, where the build config is available: the
  // content directory is what locates Git, and the process working directory
  // is only a fallback for programmatic use.
  let api: PostDiffApi | undefined;

  return definePlugin({
    name: "diff",
    processedContentCache: {
      version: "diff-v2",
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
      const revisions = await getMarkdownRevisions(api, filePath, history);
      const selected = await api.getCurrentDiff(filePath);

      context.content.html += renderDiffHistory({
        revisions,
        selected,
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
