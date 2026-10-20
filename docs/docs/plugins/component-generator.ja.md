---
title: Component Generator
---
# Component Generator

`riebeckite create component` は、型付きの Hono JSX Component を生成します。標準 Target は Site です。

```sh
riebeckite create component note-card --with-tests --with-styles
riebeckite create component note-card --target plugin --plugin notes --with-styles
```

Site Target は `app/components/<name>.tsx` を作成します。Plugin Target は `extensions/<plugin>/components/<name>.tsx` を作成し、Plugin root から default Component と Props を再 export します。Layout への自動挿入は行わず、Site author が import して配置します。

任意の stylesheet は `rr-<name>` namespace、公開 `--rb-*` Semantic Token、responsive な余白、`:focus-visible` を使います。`--with-styles` を選んだ場合は、Site にある CSS entry から stylesheet を import してください。Generator が application layout や global CSS を自動変更することはありません。

公開 Theme API では Theme が Component を所有しないため、`--target theme` は案内とともに停止します。Site または Plugin Component を作成し、Theme root から安定した `rr-*` Hook を style してください。これにより Theme の責務境界と Light/Dark Token の挙動を維持できます。

Props や markup を編集した後は Site を typecheck し、test を実行してください。Plugin Component では public package API だけを import し、Content data が必要な場合は data helper を別に export します。[UI Component の共有](./recipes/components.ja.md) と [Theme の作成](../themes/writing-a-theme.ja.md) を参照してください。
