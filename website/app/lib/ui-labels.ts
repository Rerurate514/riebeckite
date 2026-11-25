import { config } from "virtual:riebeckite/config";
import { createUiLabelContext } from "@riebeckite/core";
import { resolveUiLabels } from "@riebeckite/ui";
import { siteLabels } from "../../labels";

export function resolveShellLabels(language: string | undefined) {
  return resolveUiLabels(siteLabels, createUiLabelContext(config, language));
}
