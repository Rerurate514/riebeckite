import type { ContentIcon, OutputDependency } from "@riebeckite/core";

export type FolderPagesOptions = {
  className?: string;
  pagesLabel?: string;
  foldersLabel?: string;
};

export type ResolvedFolderPagesOptions = {
  className: string;
  pagesLabel: string;
  foldersLabel: string;
};

export type FolderPageLink = {
  title: string;
  permalink: string;
  icon?: ContentIcon;
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
