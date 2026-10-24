import type { ContentLink, ContentManifestEntry } from "@riebeckite/core";
import type { LoadedIconsSettings } from "../src/settings.js";
import type {
  IconicData,
  IconizeData,
  IconizeSettings,
  IconTarget,
} from "../src/types.js";

export const ICONIZE_SETTINGS: IconizeSettings = {
  iconPacksPath: ".obsidian/icons",
  iconColor: null,
  iconInFrontmatterEnabled: false,
  iconInFrontmatterFieldName: "icon",
  iconColorInFrontmatterFieldName: "iconColor",
  iconsInNotesEnabled: true,
  iconInLinksEnabled: true,
  iconIdentifier: ":",
  lucideIconPackType: "native",
  emojiStyle: "native",
  rules: [],
};

export function iconizeData(
  icons: Record<string, { iconName: string | null; iconColor?: string }> = {},
  settings: Partial<IconizeSettings> = {},
): IconizeData {
  return {
    settings: { ...ICONIZE_SETTINGS, ...settings },
    icons: new Map(Object.entries(icons)),
  };
}

export function iconicData(data: Partial<IconicData> = {}): IconicData {
  return {
    fileIcons: {},
    tagIcons: {},
    propertyIcons: {},
    fileRules: [],
    folderRules: [],
    ...data,
  };
}

export function loaded(
  input: {
    iconize?: IconizeData;
    iconic?: IconicData;
    packs?: LoadedIconsSettings["iconPacks"];
    vaultPrefix?: string;
  } = {},
): LoadedIconsSettings {
  return {
    ...(input.iconize ? { iconize: input.iconize } : {}),
    ...(input.iconic ? { iconic: input.iconic } : {}),
    iconPacks: input.packs ?? new Map(),
    vaultPrefix: input.vaultPrefix ?? "",
    fingerprint: "test",
    diagnostics: [],
  };
}

export function entry(
  slug: string,
  frontmatter: Record<string, unknown> = {},
  tags: string[] = [],
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    title: slug,
    frontmatter,
    publishing: { publish: true },
    html: "",
    tags,
    links: [],
    backlinks: [],
    assets: [],
  } as unknown as ContentManifestEntry;
}

export function target(
  path: string,
  options: Partial<IconTarget> = {},
): IconTarget {
  return { kind: "file", path, slug: path.replace(/\.md$/, ""), ...options };
}

export function link(raw: string, embed = false): ContentLink {
  return { raw, embed } as ContentLink;
}
