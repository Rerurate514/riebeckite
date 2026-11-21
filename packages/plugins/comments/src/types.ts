import type { ConfigValidationIssue, JsonValue } from "@riebeckite/core";

export type CommentsClientEntry = {
  readonly moduleSpecifier: string;
  readonly exportName: string;
};

export type CommentsProvider = {
  readonly name: string;
  readonly client: CommentsClientEntry;
  readonly publicConfig: JsonValue;
  readonly validateOptions?: () => readonly ConfigValidationIssue[];
};

export type CommentsInitializer<TConfig = JsonValue> = (
  config: TConfig,
) => void;

export type CommentsOptions = {
  provider: CommentsProvider;
  className?: string;
};

export type ResolvedCommentsOptions = {
  className: string;
};

export type GiscusMapping = "pathname" | "url" | "title" | "og:title";

export type GiscusInputPosition = "top" | "bottom";

export type GiscusOptions = {
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
};

export type ResolvedGiscusOptions = {
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
};

export type GiscusPublicConfig = {
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
