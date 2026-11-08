# @riebeckite/plugin-comments

Riebeckiteページにコメントスレッドを表示するプラグインです。プロバイダーを差し替えられます。

インストール:

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

オプションやプロバイダー仕様は [Comments ドキュメント](https://riebeckite.dev/docs/plugins/comments) を参照してください。
