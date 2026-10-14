---
title: Asset
sidebar:
  hidden: true
---

# Asset
Plugin assets are stylesheets or other static resources declared through the `assets` array; they reach the browser through the integration's stylesheet pipeline and are not copied into `apps/web` directly.

## Asset declaration
```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

## Pipeline
CSS from plugins is collected and delivered to the browser through the integration; never reference `/node_modules` directly from the browser. The integration resolves the module specifier and delivers it to the browser.

## Asset kinds
`PluginAssetKind` is `"style"` or `"script"`. Style assets are CSS files; script assets are JavaScript files. Both are declared in the `assets` array and reach the browser through the integration pipeline.

## Related terms
- [[plugin|Plugin]]
- [[client-entry|Client entry]]
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]

## Learn more
- [Plugin API](../reference/plugin-api.md)
- [Plugin Pipeline](../framework/plugin-system/pipeline.md)