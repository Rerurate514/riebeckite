export type GiscusMapping = "pathname" | "url" | "title" | "og:title";

export type GiscusInputPosition = "top" | "bottom";

export type CommentsOptions = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping?: GiscusMapping;
  strict?: boolean;
  reactionsEnabled?: boolean;
  inputPosition?: GiscusInputPosition;
  theme?: string;
  lang?: string;
  className?: string;
};

export type ResolvedCommentsOptions = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: GiscusMapping;
  strict: boolean;
  reactionsEnabled: boolean;
  inputPosition: GiscusInputPosition;
  theme: string;
  lang: string;
  className: string;
};

export type CommentsPublicConfig = {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: GiscusMapping;
  strict: "0" | "1";
  reactionsEnabled: "0" | "1";
  inputPosition: GiscusInputPosition;
  theme: string;
  lang: string;
};
