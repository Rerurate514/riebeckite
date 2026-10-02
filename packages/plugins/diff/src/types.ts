export type DiffLineType = "context" | "added" | "removed";

export type DiffLine = {
  type: DiffLineType;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
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
  /**
   * Content root: the directory holding the notes, used to locate the owning
   * Git work tree. Defaults to `config.content.directory` when the plugin runs
   * inside a build, otherwise `process.cwd()`. A relative value is resolved
   * against `process.cwd()`.
   */
  cwd?: string;
};

export type DiffPluginUiOptions = {
  enabled?: boolean;
  maxRevisions?: number;
};
