import type { ContentIcon, ContentManifestEntry } from "@riebeckite/core";

export type NavigationItem = {
  readonly label: string;
  readonly href?: string;
  readonly icon?: ContentIcon;
  readonly children?: readonly NavigationItem[];
  readonly external?: boolean;
  readonly collapsed?: boolean;
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
