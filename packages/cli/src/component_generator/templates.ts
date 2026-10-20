export function renderComponent(
  name: string,
  target: "site" | "plugin",
): string {
  const identifier = toIdentifier(name);
  const componentType =
    target === "plugin"
      ? 'import type { PluginComponent } from "@riebeckite/core";\n\n'
      : "";
  const assertion =
    target === "plugin" ? ` satisfies PluginComponent<${identifier}Props>` : "";
  return `${componentType}export type ${identifier}Props = {
  readonly title: string;
  readonly href?: string;
};

const ${identifier} = (({ title, href }: Readonly<${identifier}Props>) => {
  const content = <span class="rr-${name}__title">{title}</span>;
  return href ? <a class="rr-${name}" href={href}>{content}</a> : <section class="rr-${name}">{content}</section>;
})${assertion};

export default ${identifier};
`;
}

export function renderComponentCss(name: string): string {
  return `.rr-${name} {
  display: block;
  border: 1px solid var(--rb-color-border);
  color: var(--rb-color-ink);
  background: var(--rb-color-surface);
  padding: var(--rb-space-2);
}

.rr-${name}:focus-visible {
  outline: 2px solid var(--rb-color-accent);
  outline-offset: 2px;
}

.rr-${name}__title {
  font: inherit;
  font-weight: 600;
}

@media (max-width: 40rem) {
  .rr-${name} {
    padding: var(--rb-space-1);
  }
}
`;
}

export function renderComponentTest(name: string, relative: string): string {
  const identifier = toIdentifier(name);
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import ${identifier} from "${relative}";

test("renders the ${name} component", () => {
  assert.equal(typeof ${identifier}, "function");
});
`;
}

function toIdentifier(value: string): string {
  const identifier = value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
  return `${identifier.slice(0, 1).toUpperCase()}${identifier.slice(1)}`;
}
