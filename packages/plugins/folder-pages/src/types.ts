import type { ContentIcon, OutputDependency } from "@riebeckite/core";

export type FolderPagesOptions = {
  layout?: "article" | "wide";
  exclude?: readonly string[];
  className?: string;
  pagesLabel?: string;
  foldersLabel?: string;
  showDate?: boolean;
  showTags?: boolean;
};

export type ResolvedFolderPagesOptions = {
  layout: "article" | "wide";
  exclude: readonly string[];
  className: string;
  pagesLabel: string;
  foldersLabel: string;
  showDate: boolean;
  showTags: boolean;
};

export type FolderPageLink = {
  title: string;
  permalink: string;
  icon?: ContentIcon;
  date?: string;
  tags?: string[];
};

export type FolderPage = {
  folder: string;
  pathname: string;
  language?: string;
  title: string;
  icon?: ContentIcon;
  pages: FolderPageLink[];
  folders: FolderPageLink[];
  dependencies: OutputDependency[];
};

export type FolderPagesModel = {
  paths: string[];
  byPath: Map<string, FolderPage>;
};
