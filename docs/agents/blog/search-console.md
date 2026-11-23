# Google Search Console セットアップ手順

公開対象外の管理ドキュメント。ブログ開設後のSearch Console設定と運用時の確認手順。外部サービスへの登録はこの文書の読者が手動で行う前提で、手順だけを整理する。

## 1. プロパティの作成と所有権確認

1. [Google Search Console](https://search.google.com/search-console) を開き、Googleアカウントでログインする。
2. 「プロパティを追加」で「ドメイン」を選び、`riebeckite.dev` を入力する。
   - ドメインプロパティは `https://riebeckite.dev/` 配下の全URL（`/ja/` を含む）を1つのプロパティでカバーするため、URLプレフィックスではなくドメインを選ぶ。
   - DNS TXT レコードによる確認方法の詳細: [Verify your site ownership in Search Console](https://support.google.com/webmasters/answer/35181)
3. 表示された TXT レコード（`google-site-verification=...`）をコピーする。

## 2. CloudflareでのDNS TXTレコード設定

1. Cloudflare のダッシュボードで `riebeckite.dev` のゾーンを開く。
2. 「DNS」→「レコードを追加」で以下を設定する。

   | 項目 | 値 |
   |---|---|
   | タイプ | TXT |
   | 名前 | `@`（Zone apex） |
   | 内容 | Search Console が表示した `google-site-verification=...` |
   | TTL | Auto |

3. 保存後、Search Console の「確認」を押す。DNSの反映は通常数分だが、伝播次第では時間がかかる場合がある。

## 3. sitemapの提出

1. Search Console の「サイトマップ」レポートを開く。
   - 参考: [Sitemaps report](https://support.google.com/webmasters/answer/7451001)
2. `sitemap.xml` を指定して送信する（サイトのrobots.txtにも `Sitemap: https://riebeckite.dev/sitemap.xml` が既に出力されているため、クローラーはそちら経由でも見つけられる）。
3. sitemapそのものの意味と作成の一般論: [Learn about sitemaps](https://support.google.com/webmasters/answer/156184)、[Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

注意: Riebeckiteのsitemapには公開中のMarkdownコンテンツのURL（ブログ記事を含む）が載る。ブログの index ページ（`/blog/`）はアプリケーションのルートとしてsitemap対象外で、内部リンクから発見される。これは既存の `/themes/` などと同じ挙動で、欠落ではなく既知の挙動である。

## 4. インデックス状況の確認

新しい記事を公開したら:

1. [URL Inspection tool](https://support.google.com/webmasters/answer/9012289) に記事のURL（例: `https://riebeckite.dev/blog/<slug>/`）を入力する。
2. 「URL is on Google」ならインデックス済み。「URL is unknown to Google」の場合は「Request indexing」でクロールをリクエストできる（1日あたりの回数上限あり。大量のページはsitemap経由で待つほうがよい）。
3. 日本語版は `/ja/blog/<slug>/` も同じ手順で確認する。

## 5. 検索キーワードと記事単位のパフォーマンス確認

1. 「パフォーマンス」レポートを開く。
2. 主な確認項目:
   - **検索キーワード**: クエリのフィルタで「blog」関連のページを絞り、どんなクエリで表示されているかを見る。執筆計画（別ファイル）の検索意図との一致を確認する。
   - **記事単位**: ページのフィルタで `/blog/` プレフィックスを指定し、表示回数・クリック数・CTR・掲載順位を記事ごとに追う。
   - **期間比較**: 公開前後で期間を切り替えて増減を見る。
3. データは最大48時間遅れるため、公開直後ではなく数日後に確認する。

## 6. 公開後に確認すべき指標

- ブログ記事がインデックス済みになっているか（URL Inspection）
- `site:riebeckite.dev/blog/` で意図したURLが検索結果に出るか
- パフォーマンスレポートで `/blog/` 配下の表示回数が増え始めているか
- 日本語版（`/ja/blog/`）も同様に出ているか
- クエリの内容が想定読者と乖離していないか（乖離が大きいときは記事の見出し・説明・内部リンクを見直す）
- Core Web Vitals（「エクスペリエンス」）でブログ記事が「良好」を維持しているか

## 7. 方針

- アクセス解析のためだけのトラッキングスクリプトは導入しない。Search Consoleのデータで足りる運用にする。
- キーワードスタッフィングや検索キーワードごとの類似ページ量産はしない。執筆計画に沿った記事を積む。
- 多言語ページの取り扱いの一般論は Google の [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions) ドキュメントを参照する。Riebeckiteは翻訳の存在する記事だけにhreflangを出すため、未翻訳記事への誤ったhreflangは発生しない。
