export type DiffLineType = "context" | "added" | "removed";

export type DiffLine = {
  type: DiffLineType;
  content: string;
};

export type DiffRevision = {
  hash: string;
  shortHash: string;
  date: string;
  message: string;
  author: string;
};

export type MarkdownRevision = DiffRevision & {
  markdown: string;
};

export type PostDiff = {
  from: DiffRevision | null;
  to: DiffRevision;
  lines: DiffLine[];
};

export type RevisionComparisonInput = {
  filePath: string;
  fromHash: string | null;
  toHash: string;
};

export type GitHistoryReaderOptions = {
  cwd?: string;
};
