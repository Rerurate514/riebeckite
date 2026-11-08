# @riebeckite/plugin-comments

Comment threads for Riebeckite pages, backed by a pluggable provider.

Install:

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [comments()],
});
```

See the [Comments docs](https://riebeckite.dev/docs/plugins/comments) for options and provider contracts.
