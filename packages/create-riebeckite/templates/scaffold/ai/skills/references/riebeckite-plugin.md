# Plugin reference

## Start from the narrowest extension point

Create a local package with `npm exec riebeckite create plugin <name>`. Do not edit a dependency in `node_modules`.

| Need | API |
| --- | --- |
| Transform Markdown | `remarkPlugins` or `extendMarkdownPipeline` |
| Transform rendered HTML | `rehypePlugins` or `extendHtmlPipeline` |
| CSS or client entry | Plugin assets |
| Request-time behavior | lifecycle hook or endpoint |

Use the direct `remarkPlugins`/`rehypePlugins` form for one transform. Use pipeline extensions only when ordering or context is required. Semantic content transformations belong in a Plugin, not an application component.

## Cache contract

`processedContentCache.dependencyMode` describes inputs truthfully:

- `none`: output depends only on source, frontmatter, options, and declared version;
- `tracked`: the Plugin reads other content or files through `context.contentSource`;
- `unsafe`: an input cannot be observed by the framework.

Do not implement Plugin-local incremental invalidation. An untracked input must use `unsafe`; a broader rebuild is safer than stale output.

## Compatibility and verification

Keep implementation behavior inside the Plugin. Use `rr-*` hooks and `--rr-*` tokens for extensions; never claim framework `rb-*` contracts. Validate external options at the boundary and add focused coverage for invalid input and public output.

Run `npm exec riebeckite plugin verify <path> --level full`. Use `npm exec riebeckite plugin dev <path>` for browser-visible behavior.
