import type { ContentLocationInput, PostFrontmatter } from "@riebeckite/core";

export type PermalinkIdStrategy =
  | "frontmatter"
  | "hash"
  | "frontmatter-or-hash";
export type PermalinkPathMode = "flat" | "preserve" | "append";
export type RedirectStatus = 301 | 302 | 307 | 308;

export type ResolverContent = Pick<ContentLocationInput, "slug" | "path"> & {
  frontmatter: PostFrontmatter;
};

export type PermalinkOptions = {
  frontmatter?: string;
  id?: { strategy?: PermalinkIdStrategy; length?: number };
  path?: { mode?: PermalinkPathMode; prefix?: string; trailingSlash?: boolean };
  index?: { collapse?: boolean };
  override?: { frontmatter?: string };
  redirects?: { frontmatter?: string; status?: RedirectStatus };
  resolveId?: (content: ResolverContent) => string;
  resolvePath?: (input: { content: ResolverContent; id: string }) => string;
};

export type ResolvedOptions = {
  frontmatter: string;
  strategy: PermalinkIdStrategy;
  hashLength: number;
  mode: PermalinkPathMode;
  prefix: string;
  trailingSlash: boolean;
  collapseIndex: boolean;
  overrideField: string;
  redirectsField: string;
  redirectStatus: RedirectStatus;
};
