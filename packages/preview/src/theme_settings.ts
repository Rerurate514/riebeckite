import {
  resolveTheme,
  type ResolvedTheme,
  type ThemeDefinition,
  type ThemeOptions,
  type ThemeSettings,
  type ThemeSettingsSchema,
} from "@riebeckite/core";

export type ThemePreviewControl = {
  readonly key: string;
  readonly setting: ThemeSettingsSchema[string];
  readonly value: string | number | boolean;
};

export type ThemePreviewState<S extends ThemeSettingsSchema> = {
  readonly controls: readonly ThemePreviewControl[];
  readonly options: ThemeOptions<S>;
  readonly theme: ResolvedTheme;
};

export function createThemePreviewState<S extends ThemeSettingsSchema>(
  definition: ThemeDefinition<S>,
  options: ThemeOptions<S> = {},
): ThemePreviewState<S> {
  const theme = resolveTheme(definition(options), definition);
  return {
    controls: Object.entries(definition.settings).map(([key, setting]) => ({
      key,
      setting,
      value: theme.settings.values[key] ?? setting.default,
    })),
    options,
    theme,
  };
}

export function updateThemePreviewState<S extends ThemeSettingsSchema>(
  definition: ThemeDefinition<S>,
  state: ThemePreviewState<S>,
  settings: Partial<ThemeSettings<S>>,
): ThemePreviewState<S> {
  return createThemePreviewState(definition, {
    ...state.options,
    settings: { ...state.options.settings, ...settings },
  });
}

export function resetThemePreviewState<S extends ThemeSettingsSchema>(
  definition: ThemeDefinition<S>,
  state: ThemePreviewState<S>,
): ThemePreviewState<S> {
  return createThemePreviewState(definition, {
    colorMode: state.options.colorMode,
    layout: state.options.layout,
    stylesheets: state.options.stylesheets,
  });
}

export function exportThemeOptions<S extends ThemeSettingsSchema>(
  identifier: string,
  options: ThemeOptions<S>,
): string {
  return `${identifier}(${JSON.stringify(options, null, 2)})`;
}
