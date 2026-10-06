# Plugin Author DX fixture

第三者が公開 API とドキュメントだけを頼りに Plugin を作れるかを確認するための
fixture です。production の Plugin ではありません。ここで作った Plugin を
公式 Plugin として追加しないでください。

```text
tests/plugin-dx/
├─ plugins/markdown-highlight/   Level 1: remark transform（==highlight==）
├─ plugins/related-posts/        Level 2: manifest / discoverableEntries
├─ plugins/demo/                 Level 3: PageType + client entry + CSS asset
├─ dx/error-dx.test.ts           capability / PageType / route 衝突の Error DX
├─ vault/                        draft・scheduled・unlisted を含む content
└─ external/                     packed tarball を repository 外 site で検証
```

## 実行

```sh
pnpm install       # fixture 専用 workspace（root workspace からは除外）
pnpm test          # dogfood Plugin と Error DX のテスト
pnpm build         # esbuild + tsc で各 plugin の dist を生成
pnpm test:external # packed tarball を外部 site へ install して検証
```

`pnpm test:external` は `@riebeckite/core` と3つの dogfood Plugin を
`pnpm pack` し、repository 外の一時 site へ `npm install` して、公開 `exports`
だけから設定を読み込み、content build・PageType・publication boundary・
型定義を検証します。workspace magic に依存していれば失敗します。
