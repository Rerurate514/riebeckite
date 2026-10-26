---
date: 2026-10-14
title: ContentSource（コンテンツソース）
sidebar:
  hidden: true
---

# ContentSource（コンテンツソース）

パイプラインのほかの部分のためにコンテンツを見つけて読み取る抽象です。標準の実装はファイルシステムやObsidian vaultを読み取るため、ContentManagerがファイルシステムを直接たどることはありません。

## パイプラインの読み取り側

コンテンツソースは走査と読み取りを担います。パスとバイト列を持つ生のエントリを返し、解析と公開先の解決は後段で行います。

読み取りがインターフェースの背後にあるため、ContentManagerを変えずに、ローカルのディレクトリ、Obsidian vault、その他のソースを同じビルドで扱えます。

## 分離している理由

取得を分離しておくと、キャッシュと増分ビルドがファイルの同一性をもとに判断でき、処理は受け取ったエントリに対して純粋なまま保てます。

## コンテンツソースの種類

Node.js 向けの標準実装は、`@riebeckite/node` の `FileSystemContentSource`
（`packages/node/src/file_system_content_source.ts`）です。ディレクトリツリーを
走査し、`ContentSource` インターフェースを通じてファイルを読み取ります。
カスタムのソースも同じインターフェースを実装すれば、ContentManager を変更せずに
Obsidian vault、クラウドストレージ、その他のファイルシステムに似たソースから
読み取れます。

`ContentSource`インターフェース（`packages/core/src/content/content_source.ts`）は次を定義します。

- **`scan()`** — `Promise<readonly ContentSourceEntry[]>`を返す。各エントリは`path`と任意の`metadata`（modified、size、etag、hash）を持つ
- **`read(entry)`** — `Promise<ContentSourceContent>`を返す。生のファイルのバイト列またはテキスト

`ContentSourceEntry`の例：

```ts
{
  path: "content/notes/hello.md",
  metadata: {
    modifiedAt: 1700000000000,
    size: 42,
    etag: '"abc123"',
    hash: "sha256:xyz..."
  }
}
```

最小限のカスタムコンテンツソースの例：

```ts
const mySource: ContentSource = {
  async scan() {
    // Return entries for each file to process
    return [{ path: "my/path.md" }];
  },
  async read(entry) {
    // Read the file content (string or Uint8Array)
    return await fs.promises.readFile(entry.path, "utf8");
  }
};
```

## 関連用語

- [[glossary/content|Content]]
- [[content-entry|Content Entry]]
- [[frontmatter|Frontmatter]]
- [[content-manager|Content Manager]]
- [[glossary/obsidian-vault|Obsidian Vault]]
