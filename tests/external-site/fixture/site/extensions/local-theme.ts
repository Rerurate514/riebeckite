import { defineTheme, defineThemeSettings } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export const localFixtureTheme = defineTheme({
  name: "fixture-local",
  styles: [
    ...defaultTheme.styles,
    { moduleSpecifier: "../../extensions/local-theme.css" },
  ],
  settings: defineThemeSettings({
    fixture: {
      type: "select",
      label: "Fixture",
      default: "local",
      options: [{ value: "local", label: "Local" }],
    },
  }),
});
