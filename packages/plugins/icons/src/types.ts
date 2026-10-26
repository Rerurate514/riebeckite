import type { ContentIcon } from "@riebeckite/core";

export type IconSource = "iconize" | "iconic";

export type IconPrecedence = "config" | "frontmatter" | IconSource;

export type IconOverride = string | { icon: string; color?: string };

export type IconsOptions = {
  /** Sources to read. Defaults to both Iconize and Iconic. */
  sources?: readonly IconSource[];
  /** Resolve colon-delimited inline icons in Markdown. Defaults to `true`. */
  inline?: boolean;
  /** Read the icon field from frontmatter. Defaults to `true`. */
  frontmatter?: boolean;
  /** Apply configured icon colors. Defaults to `true`. */
  colors?: boolean;
  /** Per-surface source order. Defaults to config, frontmatter, iconic, iconize. */
  precedence?: readonly IconPrecedence[];
  /** Explicit icons keyed by vault-relative file or folder path. */
  overrides?: Readonly<Record<string, IconOverride>>;
  /** Obsidian vault root. Detected from the content directory when omitted. */
  vaultRoot?: string;
  /** Vault path prefix for the content directory, for example `"content/"`. */
  vaultPrefix?: string;
  iconize?: {
    enabled?: boolean;
    dataFile?: string;
    iconPacks?: string;
  };
  iconic?: {
    enabled?: boolean;
    dataFile?: string;
  };
};

export type ResolvedIconsOptions = {
  sources: readonly IconSource[];
  inline: boolean;
  frontmatter: boolean;
  colors: boolean;
  precedence: readonly IconPrecedence[];
  overrides: Readonly<Record<string, IconOverride>>;
  vaultRoot?: string;
  vaultPrefix?: string;
  iconize: {
    enabled: boolean;
    dataFile?: string;
    iconPacks?: string;
  };
  iconic: {
    enabled: boolean;
    dataFile?: string;
  };
};

export type IconizeSettings = {
  iconPacksPath: string;
  iconColor: string | null;
  iconInFrontmatterEnabled: boolean;
  iconInFrontmatterFieldName: string;
  iconColorInFrontmatterFieldName: string;
  iconsInNotesEnabled: boolean;
  iconInLinksEnabled: boolean;
  iconIdentifier: string;
  lucideIconPackType: "none" | "custom" | "native";
  emojiStyle: "native" | "twemoji";
  rules: readonly IconizeRule[];
};

export type IconizeRule = {
  rule: string;
  icon: string;
  order: number;
  color?: string | null;
  useFilePath?: boolean;
  for?: "everything" | "files" | "folders";
};

export type IconizeValue = { iconName: string | null; iconColor?: string };

export type IconizeData = {
  settings: IconizeSettings;
  icons: ReadonlyMap<string, IconizeValue>;
};

export type IconicValue = { icon?: string; color?: string };

type IconicCondition = {
  source?: string;
  operator?: string;
  value?: string;
};

export type IconicRule = {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  match?: "all" | "any" | "none";
  conditions?: readonly IconicCondition[];
  enabled?: boolean;
};

export type IconicData = {
  fileIcons: Readonly<Record<string, IconicValue>>;
  tagIcons: Readonly<Record<string, IconicValue>>;
  propertyIcons: Readonly<Record<string, IconicValue>>;
  fileRules: readonly IconicRule[];
  folderRules: readonly IconicRule[];
};

type IconTargetKind = "file" | "folder";

export type IconTarget = {
  kind: IconTargetKind;
  /** Vault-relative path. Files include their extension. */
  path: string;
  /** Slug for files, folder path for folders. */
  slug: string;
  frontmatter?: Readonly<Record<string, unknown>>;
  tags?: readonly string[];
  links?: readonly string[];
  embeds?: readonly string[];
  created?: Date;
  modified?: Date;
};

export type ResolvedIconSpec = {
  /** Namespaced icon reference, for example `lucide:rocket` or `emoji:smile`. */
  id: string;
  source: IconPrecedence;
  kind: ContentIcon["kind"];
  /** Vault path, tag, or property the icon applies to. */
  target: string;
  color?: string;
  label?: string;
};
