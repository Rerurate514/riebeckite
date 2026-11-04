export type ArchiveOptions = {
  basePath?: string;
  pageSize?: number;
  locale?: string;
  className?: string;
  localeMode?: "current" | "fallback" | "all";
};

export type ResolvedArchiveOptions = {
  basePath: string;
  pageSize: number;
  locale: string | null;
  className: string;
  localeMode: "current" | "fallback" | "all";
};

export type ArchivePage = {
  title: string;
  html: string;
};
