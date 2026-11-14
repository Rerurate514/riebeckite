import {
  fingerprintExternalValue,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  type IconDiagnostic,
  type IconPackFile,
  type IconPacks,
  loadIconPacks,
  normalizeIconName,
} from "./icon_packs.js";
import { parseIconicData } from "./icons_settings_iconic.js";
import { parseIconizeData } from "./icons_settings_iconize.js";
import { readJsonFile } from "./icons_settings_io.js";
import {
  resolveDataFile,
  resolvePackRoot,
  resolveVaultPrefix,
  resolveVaultRoot,
} from "./icons_settings_resolve.js";
import {
  DEFAULT_ICONIZE_SETTINGS,
  ICONIC_ID,
  ICONIZE_ID,
  type LoadedIconsSettings,
} from "./icons_settings_types.js";
import type { IconicData, IconizeData, ResolvedIconsOptions } from "./types.js";

export async function loadIconsSettings(
  options: ResolvedIconsOptions,
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<LoadedIconsSettings> {
  const diagnostics: IconDiagnostic[] = [];
  const contentDirectory = config?.content.directory;
  const vaultRoot = await resolveVaultRoot(options, contentDirectory);
  const vaultPrefix = resolveVaultPrefix(options, vaultRoot, contentDirectory);
  const dataRoot = vaultRoot ?? process.cwd();

  let iconize: IconizeData | undefined;
  if (options.iconize.enabled) {
    const dataFile = await resolveDataFile({
      explicit: options.iconize.dataFile,
      pluginId: ICONIZE_ID,
      root: dataRoot,
      vaultRoot,
      diagnostics,
      source: "Iconize",
    });
    if (dataFile) {
      const raw = await readJsonFile(dataFile, "Iconize", diagnostics);
      if (raw !== undefined) iconize = parseIconizeData(raw, diagnostics);
    }
  }

  let iconic: IconicData | undefined;
  if (options.iconic.enabled) {
    const dataFile = await resolveDataFile({
      explicit: options.iconic.dataFile,
      pluginId: ICONIC_ID,
      root: dataRoot,
      vaultRoot,
      diagnostics,
      source: "Iconic",
    });
    if (dataFile) {
      const raw = await readJsonFile(dataFile, "Iconic", diagnostics);
      if (raw !== undefined) iconic = parseIconicData(raw, diagnostics);
    }
  }

  const iconPacksRoot = vaultRoot
    ? resolvePackRoot(
        vaultRoot,
        options.iconize.iconPacks ??
          iconize?.settings.iconPacksPath ??
          DEFAULT_ICONIZE_SETTINGS.iconPacksPath,
      )
    : undefined;
  const iconPacks = iconPacksRoot
    ? await loadIconPacks(iconPacksRoot, diagnostics)
    : new Map();

  return {
    ...(iconize === undefined ? {} : { iconize }),
    ...(iconic === undefined ? {} : { iconic }),
    iconPacks,
    ...(iconPacksRoot === undefined ? {} : { iconPacksRoot }),
    vaultPrefix,
    fingerprint: fingerprintExternalValue({
      iconize: iconize
        ? { settings: iconize.settings, icons: [...iconize.icons] }
        : null,
      iconic: iconic ?? null,
      packs: [...iconPacks].map(([pack, files]) => [
        pack,
        [...files].map(([name, file]) => [name, file.size, file.modified]),
      ]),
    }),
    diagnostics,
  };
}

export function findIconPackFile(
  packs: IconPacks,
  packName: string,
  iconName: string,
): IconPackFile | undefined {
  const pack = packs.get(packName.toLowerCase());
  if (!pack) return undefined;
  return pack.get(normalizeIconName(iconName).toLowerCase());
}
