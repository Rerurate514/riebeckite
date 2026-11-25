import type { UiConfig } from "./riebeckite_config.js";

export type UiLabelOverrides = NonNullable<UiConfig["labels"]>;

export type UiLabelContext = {
  readonly language?: string;
  readonly overrides?: UiLabelOverrides;
};

export function createUiLabelContext(
  config: Pick<{ ui?: UiConfig }, "ui"> | undefined,
  language?: string,
): UiLabelContext {
  return {
    language: config?.ui?.locale ?? language,
    overrides: config?.ui?.labels,
  };
}
