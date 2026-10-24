import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html, raw } from "hono/html";
import { getProperties } from "../src/component-data.js";
import { mergePropertiesOptions } from "../src/options.js";
import { renderPropertiesData } from "../src/render.js";
import type { PropertiesData, PropertiesOptions } from "../src/types.js";

export type PropertiesProps = {
  data?: PropertiesData;
  options?: PropertiesOptions;
  className?: string;
};

const Properties = (({
  data: explicitData,
  options,
  className,
}: Readonly<PropertiesProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const data =
    explicitData ??
    (site && article
      ? getProperties({
          view: site.view,
          frontmatter: article.post.frontmatter,
          options: mergePropertiesOptions(
            findPropertiesOptions(site.config.plugins),
            options,
          ),
          icons: site.manifest.icons,
        })
      : undefined);

  if (!data || data.items.length === 0) return html``;

  const extraClass = className?.trim();
  return raw(
    renderPropertiesData({
      ...data,
      className: extraClass
        ? `${data.className} ${extraClass}`
        : data.className,
    }),
  );
}) satisfies PluginComponent<PropertiesProps>;

export default Properties;

function findPropertiesOptions(
  plugins: readonly { name: string; options?: unknown }[],
): PropertiesOptions | undefined {
  return plugins.find((plugin) => plugin.name === "properties")?.options as
    | PropertiesOptions
    | undefined;
}
