import type { IconDiagnostic, IconPacks } from "./icon_packs.js";
import type { IconicData, IconizeData, IconizeSettings } from "./types.js";

export const ICONIZE_ID = "obsidian-icon-folder";

export const ICONIC_ID = "iconic";

export const MAX_SETTINGS_BYTES = 2 * 1024 * 1024;

export type LoadedIconsSettings = {
  readonly iconize?: IconizeData;
  readonly iconic?: IconicData;
  readonly iconPacks: IconPacks;
  readonly iconPacksRoot?: string;
  readonly vaultPrefix: string;
  readonly fingerprint: string;
  readonly diagnostics: readonly IconDiagnostic[];
};

export const DEFAULT_ICONIZE_SETTINGS: IconizeSettings = {
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
