import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import type { PropertiesData } from "../src/component-data.js";
import { getProperties } from "../src/component-data.js";
import type { PropertiesOptions } from "../src/types.js";

export type PropertiesProps = { data?: PropertiesData };

const Properties = (async ({
  data: explicitData,
}: Readonly<PropertiesProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const data =
    explicitData ??
    (site && article
      ? await getProperties({
          view: site.view,
          frontmatter: article.post.frontmatter,
          options: findPropertiesOptions(site.config.plugins),
        })
      : undefined);
  if (!data) return html``;
  if (data.items.length === 0) return html``;
  const cls = data.className;
  return (
    <section
      class={cls}
      data-properties
      data-property-count={data.items.length}
    >
      <h2 class={`${cls}__title`}>{data.title}</h2>
      <dl class={`${cls}__rows`}>
        {data.items.map((item) => (
          <div
            class={`${cls}__row`}
            data-property-key={item.key}
            key={item.key}
          >
            <dt class={`${cls}__key`}>{item.key}</dt>
            <dd class={`${cls}__value`}>
              {item.value.map((part, index) =>
                part.href ? (
                  <a href={part.href} key={`${item.key}-${index}`}>
                    {part.text}
                  </a>
                ) : (
                  <span key={`${item.key}-${index}`}>{part.text}</span>
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
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
