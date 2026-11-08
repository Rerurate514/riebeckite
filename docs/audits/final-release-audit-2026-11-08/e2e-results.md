# E2E Results

## 公開 tarball 外部サイト

`pnpm test:e2e:external` を package build 完了後に直列実行した。

- 116 public package を pack
- 外部 starter site を tarball から install
- site build 成功
- 11 の expected HTML output を検査
- 外部 TypeScript 検査成功

先行する並列実行で発生した `@riebeckite/core` declaration 不足は、同時の build が dist を置換した生成物競合だった。直列再実行で再現しなかった。

## 増分・fast path

`pnpm test:e2e:fast-path` は standard starter で以下を確認した。

- no-change fast path は Vite/SSG を起動せずに利用
- 本文、frontmatter、追加、削除、移動、公開状態、plugin option の変更が fast path を停止
- feed の変更・削除と extra dist file が output inventory mismatch として停止
- `--full` が full-build-requested として停止
- recovery 後は再び fast path を利用

`pnpm test:e2e:preset-fast-path` は empty、minimal、starter を通過した。showcase の実行中に上限に達したため、残り preset を確認できていない。

## SVG security と Mermaid client

Chromium/Puppeteer の `packages/plugins/mermaid/test/client.browser.test.ts` で、root `onload`、`script`、`foreignObject`、`javascript:` link を含む SVG を Mermaid client に投入した。`foreignObject` 内の `Hello&nbsp;world` label は保持する。

- hostile SVG: sanitization 後に accepted
- DOM: `script`、`onload`、`javascript:` は不在。安全な `foreignObject` label は存在
- `globalThis.pwned`: `false`

独立レビューで、初回 sanitizer の `foreignObject` 除去が Mermaid の HTML label と衝突し、`use` / `image` の全除去がローカル SVG 参照を壊す可能性を検出した。HTML parser で SVG を inert に parse し、foreignObject は script、active HTML 要素、イベント属性、外部参照、危険 CSS を除去して保持する方式へ修正した。Mermaid は root と flowchart の両方で HTML label を無効化し、`href` / `xlink:href` は同一文書の `#` 参照だけを許可する。ローカル Mermaid 11 を使う実 Chromium probe でも flowchart の SVG と text label が表示された。

## 非実行・未完了

- real Cloudflare deployment、npm publish、production deployment は意図的に未実行
- full recursive tests は実行上限で未完了
- all-preset fast-path は showcase 以降未完了
