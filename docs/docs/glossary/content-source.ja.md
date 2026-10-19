---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムやObsidian vaultを読み取るため、Content Managerがファイルシステムを直接走査することはありません。

## 読み取り側の役割

content sourceは走査と読み取りを担います。パスとバイト列を持つ生のentryを返し、解析と公開位置の解決は後段で行います。

読み取りがインターフェースの背後にあるため、ローカルのディレクトリでもObsidian vaultでも、Content Managerを変えずに同じBuildで扱えます。

## 分離しておく理由

取得を分離すると、cacheとincremental buildがファイルの同一性をもとに判断でき、処理は受け取ったentryに対して純粋なまま保てます。

## Content Sourceの種類

標準の実装は`FileSystemContentSource`(`packages/core/src/content/file_system_content_source.ts`)で、ディレクトリツリーをスキャンしてファイルを読み取ります。`ContentSource`インターフェース経由で行うため、Content Managerを変更せずにObsidian vaultやクラウドストレージなど、任意のファイルシステムソースから読み取るカスタムソースを実装できます。

`ContentSource`インターフェース(`packages/core/src/content/content_source.ts`)は以下を定義します：

- **`scan()`** ：`ContentSourceEntry`の配列を返します。各エントリは`path`とオプションの`metadata`（modified, size, etag, hash）を持ちます
- **`read(entry)`** ：`ContentSourceContent`を返します。生のファイルバイトまたはテキストです

`ContentSourceEntry`の例:

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

最小限のカスタムcontent source:

```ts
const mySource: ContentSource = {
  async scan() {
    // 処理する各ファイルのエントリを返します
    return [{ path: "my/path.md" }];
  },
  async read(entry) {
    // ファイル内容を読み込みます（stringまたはUint8Array）
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
