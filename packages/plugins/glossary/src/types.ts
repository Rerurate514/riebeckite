export type GlossaryOptions = {
  layout?: "article" | "wide";
  basePath?: string;
  className?: string;
  key?: string;
  termKey?: string;
  definitionKey?: string;
  title?: string;
  localeMode?: "current" | "fallback" | "all";
};

export type ResolvedGlossaryOptions = Required<GlossaryOptions>;

export type GlossaryEntry = {
  definition: string | null;
  permalink: string;
  term: string;
};
