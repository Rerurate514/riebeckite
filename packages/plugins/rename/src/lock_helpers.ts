export const LOCK_VERSION = 1;

export type RedirectStatus = 301 | 302 | 307 | 308;

export type RouteLockRoute = {
  permalink: string;
  contentHash: string;
  id?: string;
};

export type RenameDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  slug?: string;
  suggestion?: string;
};

export type RouteLockSourceEntry = {
  slug: string;
  permalink: string;
  frontmatter: Record<string, unknown>;
  html: string;
};
