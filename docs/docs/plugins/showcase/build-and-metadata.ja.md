# ビルド時・メタデータに作用する Plugin

本文には現れず、生成物や head、リダイレクトとして結果が出る Plugin です。一部は opt-in でこのサイトでは有効になっていません。表には生成されるものを記載しています。

| Plugin | 生成されるもの |
| --- | --- |
| [`seo`](../seo.ja.md) | sitemap.xml / robots.txt / feed / head の canonical と OGP |
| [`citations`](../citations.ja.md) | 番号付き引用と References セクション |
| [`webmention`](../webmention.ja.md) | webmentions.json と送受信のエンドポイント |
| [`alias`](../alias.ja.md) | 別名からのリダイレクト |
| [`series`](../series.ja.md) | `series` frontmatter による前後ナビと一覧ページ |
| [`recent-posts`](../recent-posts.ja.md) | 最新記事の一覧（Site が配置） |
| [`daily-notes`](../daily-notes.ja.md) | デイリーノートの短いスニペット（Site が配置） |
| [`rename`](../rename.ja.md) | 旧パスからのリダイレクト |
| [`deploy`](../deploy.ja.md) | 各ホスト向けのデプロイ設定ファイル |
| [`diagnostics`](../diagnostics.ja.md) | 孤立ノートや未使用アセットの診断 |
| [`quality`](../quality.ja.md) | 見出し順や重複 id などの品質チェック |
| [`hard-breaks`](../hard-breaks.ja.md) | ソフト改行をビルド時に `<br>` へ変換（opt-in） |
| [`mermaid`](../mermaid.ja.md) | headless browser によるビルド時 SVG（このサイトは Mermaid (Pele) を使用） |
| [`permalink`](../permalink.ja.md) | frontmatter の ID から安定した公開 URL とリダイレクトを生成 |
| [`analytics`](../analytics.ja.md) | collector の設定とクライアント側のイベント送信 |
| [`discord-embed`](../discord-embed.ja.md) | Discord のリンクプレビュー用メタデータ |
| [`image-optimizer`](../image-optimizer.ja.md) | Responsive Image が使う WebP / AVIF 派生画像 |
| [`svg-optimizer`](../svg-optimizer.ja.md) | 同じパスで置き換える最適化済み SVG |

実際の例については[プラグイン作成の詳細](/series/plugins-in-depth-ja)を参照してください。
