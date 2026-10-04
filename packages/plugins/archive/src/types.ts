export type ArchiveOptions = {
  basePath?: string;
  pageSize?: number;
  locale?: string;
  className?: string;
};

export type ResolvedArchiveOptions = {
  basePath: string;
  pageSize: number;
  locale: string | null;
  className: string;
};

export type ArchivePage = {
  title: string;
  html: string;
};
