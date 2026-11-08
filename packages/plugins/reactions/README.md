# @riebeckite/plugin-reactions

Emoji reaction buttons for Riebeckite pages, backed by a pluggable provider.

Install:

```sh
npm install @riebeckite/plugin-reactions
```

```ts
import { defineConfig } from "@riebeckite/core";
import { reactions } from "@riebeckite/plugin-reactions";

export default defineConfig({
  plugins: [reactions()],
});
```

See the [Reactions docs](https://riebeckite.dev/docs/plugins/reactions) for options and provider contracts.
