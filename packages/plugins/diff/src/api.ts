import { createLineDiff } from "./diff/line_diff.js";
import { GitMarkdownHistoryReader } from "./git/history_reader.js";
import type {
  DiffRevision,
  GitHistoryReaderOptions,
  MarkdownRevision,
  PostDiff,
  RevisionComparisonInput,
} from "./types.js";

export type PostDiffApi = {
  getHistory(filePath: string): Promise<DiffRevision[]>;
  getRevisionMarkdown(filePath: string, hash: string): Promise<string | null>;
  getCurrentDiff(filePath: string): Promise<PostDiff | null>;
  compareRevisions(input: RevisionComparisonInput): Promise<PostDiff | null>;
};

export function createPostDiffApi(
  options: GitHistoryReaderOptions = {},
): PostDiffApi {
  return createPostDiffApiFromReader(new GitMarkdownHistoryReader(options));
}

export function createPostDiffApiFromReader(
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

export async function getMarkdownRevisions(
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
