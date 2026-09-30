# Installation

Riebeckite でサイトを作るだけなら、この monorepo は clone しません。`create-riebeckite` がサイト用のファイルを生成します。

## 必要なもの

- Node.js LTS
- npm
- ターミナル
- デプロイする場合は Cloudflare アカウント

```bash
node -v
npm -v
```

## サイトを作る

```bash
npx create-riebeckite my-site
cd my-site
npm install
```

既定の preset は `starter` です。別の preset を使う場合は次のように指定します。

```bash
npx create-riebeckite my-site --preset minimal
npx create-riebeckite --list-presets
```

既存ディレクトリへ生成する場合は、上書きしてよいことを確認してから `--force` を使います。

## 生成される主なファイル

| ファイル | 役割 |
| --- | --- |
| `riebeckite.config.ts` | site、content、theme、plugins の設定 |
| `content/` | Markdown を置く場所 |
| `app/` | HonoX アプリのシェル |
| `package.json` | `dev`、`build`、`check` などの scripts |

## 確認する

```bash
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite inspect config
npm exec riebeckite inspect content --list
npm exec riebeckite dev
```
