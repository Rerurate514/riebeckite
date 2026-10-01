import type { ContentManifestEntry } from "@riebeckite/core";

export type DocsOptions = {
  readonly root: string;
  readonly sidebar?: {
    readonly auto?: boolean;
    readonly label?: string;
  };
  readonly prevNext?: boolean;
};

export type ResolvedDocsOptions = {
  readonly root: string;
  readonly sidebar: {
    readonly auto: boolean;
    readonly label: string;
  };
  readonly prevNext: boolean;
};

export type DocsSidebarFrontmatter = {
  readonly label?: string;
  readonly order?: number;
  readonly hidden?: boolean;
  readonly collapsed?: boolean;
};

export type DocsNavigationItem = {
  readonly title: string;
  readonly href?: string;
  readonly slug?: string;
  readonly order?: number;
  readonly collapsed?: boolean;
  readonly children: readonly DocsNavigationItem[];
};

export type DocsNavigationEntry = {
  readonly entry: ContentManifestEntry;
  readonly relativePath: string;
  readonly segments: readonly string[];
  readonly isIndex: boolean;
  readonly title: string;
  readonly order: number | undefined;
  readonly hidden: boolean;
  readonly collapsed: boolean | undefined;
};

export type DocsNavigationLink = {
  readonly title: string;
  readonly href: string;
  readonly slug: string;
};
