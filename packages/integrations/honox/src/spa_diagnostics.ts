import {
  type Diagnostic,
  definePlugin,
  type PluginGeneratedHtml,
  type RiebeckitePlugin,
} from "@riebeckite/core";

export const SPA_DIAGNOSTICS_PLUGIN_NAME = "riebeckite:spa-diagnostics";

const MAIN_CONTENT_PATTERN = /<main\b[^>]*\bid=["']main-content["']/iu;
const REDIRECT_PATTERN =
  /<meta\b[^>]*\bhttp-equiv=["']refresh["'][^>]*\bcontent=["'][^"']*\burl=/iu;

export function inspectSpaPage(page: PluginGeneratedHtml): Diagnostic[] {
  if (REDIRECT_PATTERN.test(page.html)) return [];
  if (MAIN_CONTENT_PATTERN.test(page.html)) return [];
  return [
    {
      code: "spa-missing-main-content",
      severity: "error",
      message:
        'SPA navigation is enabled but this page has no <main id="main-content">. Add one to the page layout, or disable SPA for the site.',
      filePath: page.path,
      suggestion:
        'Render <main id="main-content" tabindex={-1}> around the page body.',
    },
  ];
}

export function spaDiagnostics(): RiebeckitePlugin {
  return definePlugin({
    name: SPA_DIAGNOSTICS_PLUGIN_NAME,
    inspectGeneratedHtml: inspectSpaPage,
  });
}
