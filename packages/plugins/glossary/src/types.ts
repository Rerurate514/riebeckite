export type GlossaryOptions = {
  basePath?: string;
  className?: string;
  key?: string;
  termKey?: string;
  definitionKey?: string;
  title?: string;
};

export type ResolvedGlossaryOptions = Required<GlossaryOptions>;

export type GlossaryEntry = {
  definition: string | null;
  permalink: string;
  term: string;
};
