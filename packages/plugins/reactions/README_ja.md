# @riebeckite/plugin-reactions

Riebeckiteページに絵文字リアクションボタンを表示するプラグインです。プロバイダーを差し替えられます。

インストール:

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

オプションやプロバイダー仕様は [Reactions ドキュメント](https://riebeckite.dev/docs/plugins/reactions) を参照してください。
