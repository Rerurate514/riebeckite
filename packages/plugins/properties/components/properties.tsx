import type { PluginComponent } from "@riebeckite/core";
import type { PropertiesData } from "../src/component-data.js";

export type PropertiesProps = { data: PropertiesData };

const Properties = (({ data }: Readonly<PropertiesProps>) => {
  if (data.items.length === 0) return null;
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
