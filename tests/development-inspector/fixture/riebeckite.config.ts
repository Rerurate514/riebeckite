import {
  defineConfig,
  defineDerivedView,
  definePlugin,
} from "@riebeckite/core";
import { diagnostics } from "@riebeckite/plugin-diagnostics";
import { defaultTheme } from "@riebeckite/theme-default";

const publicTitles = defineDerivedView<{ titles: readonly string[] }, string[]>(
  {
    id: "e2e.public-titles",
    version: "1",
    compute({ titles }, context) {
      context.track({
        type: "query",
        id: "public-titles",
        properties: ["title"],
      });
      return [...titles];
    },
  },
);

const derivedFixture = definePlugin({
  name: "e2e-derived",
  derivedViews: [publicTitles],
  async setup({ derived }) {
    await derived.resolve(publicTitles, { titles: [] });
  },
  async planGeneratedOutputs({ derived, manifest }) {
    const resolved = await derived.resolveWithDependencies(publicTitles, {
      titles: manifest.routableEntries.map((entry) => entry.title),
    });
    return [
      {
        path: "derived/titles.json",
        content: JSON.stringify(resolved.value),
        derivedDependencies: resolved.dependencies,
        derivedViewIds: resolved.viewIds,
      },
    ];
  },
});

export default defineConfig({
  site: {
    title: "Inspector E2E",
    description: "Development Inspector end-to-end fixture.",
    baseUrl: "https://inspector.example.com",
    locale: "en",
  },
  content: { directory: "content", exclude: ["ignored/**"] },
  spa: {},
  theme: defaultTheme(),
  plugins: [diagnostics({ requiredFrontmatter: ["title"] }), derivedFixture],
});
