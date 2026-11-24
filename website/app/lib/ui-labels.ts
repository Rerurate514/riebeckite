import { config } from "virtual:riebeckite/config";
import { resolveUiLabels } from "@riebeckite/ui";
import { siteLabels } from "../../labels";

export function resolveShellLabels(language: string | undefined) {
  return resolveUiLabels(
    siteLabels,
    config.ui?.locale ?? language,
    config.ui?.labels,
  );
}
