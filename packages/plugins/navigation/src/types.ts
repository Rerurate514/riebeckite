import type { ContentManifestEntry } from "@riebeckite/core";

export type NavigationItem = {
  readonly label: string;
  readonly href?: string;
  readonly children?: readonly NavigationItem[];
  readonly external?: boolean;
};

export type NavigationOptions = {
  readonly items?: readonly NavigationItem[];
  readonly secondary?: readonly NavigationItem[];
};

export type SiteNavigation = {
  readonly primary: readonly NavigationItem[];
  readonly secondary: readonly NavigationItem[];
};

export type NavigationEntry = {
  readonly entry: ContentManifestEntry;
  readonly segments: readonly string[];
  readonly isIndex: boolean;
  readonly title: string;
};

export type NavigationSource = {
  readonly plugins?: readonly {
    readonly name: string;
    readonly options?: unknown;
    readonly enabled?: boolean;
  }[];
};
