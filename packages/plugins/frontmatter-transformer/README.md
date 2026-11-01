# @riebeckite/plugin-frontmatter-transformer

Safe bulk frontmatter transformations for Riebeckite. The plugin adds namespaced CLI commands that reuse the existing Content Migration planner, mutation journal, history, and rollback. It does not implement a separate migration engine.

```ts
import { frontmatterTransformer } from "@riebeckite/plugin-frontmatter-transformer";

plugins: [frontmatterTransformer()];
```

```sh
riebeckite frontmatter presets
riebeckite frontmatter plan --preset normalize-tags
riebeckite frontmatter apply --preset normalize-tags --apply
riebeckite frontmatter history
riebeckite frontmatter rollback <plan-id> --apply
```

`plan` and `apply` are dry runs unless `--apply` is passed. Pass `--preset` more than once to combine presets.

## Presets

- `normalize-tags` splits string or comma-separated tags into a deduplicated list.
- `trim-text` trims leading and trailing whitespace in `title` and `description`, removing the field when it becomes empty.
- `remove-empty-fields` removes empty `description`, `image`, `tags`, and `aliases` fields.

Saved plans can be applied with `--plan <path>`; plan files and state live under the content directory's `.riebeckite/migrations` by default. Every write keeps a mutation journal and can be rolled back.
