---
title: Obsidian のノートを Cloudflare に公開する方法
description: Obsidian のノートを Cloudflare Pages と Workers に無料で公開する手順。2026年11月時点の公式の推奨、無料枠の実際の数字、GitHub Pages との比較、Riebeckite での設定までをまとめました。
date: 2026-11-21
category: Tutorials
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - cloudflare
  - tutorial
---

最初に開示しておくと、このブログは私が開発しているフレームワーク Riebeckite 上で動いていて、ホストは Cloudflare を使っています。それでもこの記事は特定ツールの宣伝ではなくて、Cloudflare 自体の 2026 年 11 月時点の情報をまとめるのが目的です。事実に誤りがあれば GitHub の issue で教えてください。直します。

## Cloudflare は無料でどこまでできるのか

Obsidian のノートを無料公開するルートの話を前に書きました。

[/blog/publish-obsidian-notes-for-free/](/blog/publish-obsidian-notes-for-free/)

あちらでは GitHub Pages を無料ホストの代表にしましたが、実は日本語圏ではほとんど記事がない選択肢がもう一つあります。Cloudflare です。Quartz のチュートリアル記事は GitHub Pages か Netlify で止まっていることが多くて、Cloudflare を扱ったものは私が見た限りゼロでした。なのでこの記事を書いています。

前置きを一つ。Cloudflare にノートを公開するというのは、正確には「ノートを静的サイトにビルドして、その成果物（Quartz なら `public/`、Riebeckite なら `dist/`）を Cloudflare に置く」ということです。ここはどのツールでも同じです。

## 2026 年の Cloudflare: Pages と Workers の関係

まず押さえてほしいことがあります。Cloudflare には Pages と Workers の2つの製品があって、2026 年 11 月時点では公式が「新規プロジェクトは Workers から」と案内しています。Pages の公式ドキュメントの冒頭に、意図的に目を引く形でこう書かれています。

> Are you sure you want to use Pages? Workers supports most Pages use cases and offers a broader feature set. It is Cloudflare's primary platform for building applications. Start new projects with Workers.

（Pages を使う前に確認ください。Workers はほとんどの Pages のユースケースをカバーしていて、より広い機能を持ちます。Cloudflare の主なアプリケーション基盤は Workers です。新しいプロジェクトは Workers で始めてください。）[developers.cloudflare.com/pages/（2026年11月時点）](https://developers.cloudflare.com/pages/)

![The current notice on the Cloudflare Pages documentation](/assets/blog/cloudflare-pages-notice.png)
*(2026年11月時点のスクリーンショット)*

これは Pages が使えなくなったという意味ではありません。Pages のドキュメントはまだメンテナンスされているし（2026年8月更新）、Pages から Workers への公式の移行ガイドも用意されています。静的サイトを置くだけなら Pages は今も普通に成立します。ただ「これから始める人へのおすすめ」は Workers のほうだよ、というのが公式の立場です。この記事は両方を扱います。

## Pages の無料枠、実際の数字

無料枠の数字は全部公式の limits ページ（2026年11月19日更新）からです。

- ビルド回数は **月500回**（無料プラン）。同時ビルドは1本で、1回のビルドは20分でタイムアウト。
- ファイル数は **1プロジェクト20,000ファイル**（無料）。有料だと100,000。
- 1ファイルの上限は **25 MiB**。
- カスタムドメインは **1プロジェクトに100個** まで。
- プロジェクト数は **1アカウント100個** まで。
- デプロイの保持は **30日**。ただし直近100件のデプロイはずっと残る。

帯域については注意が要ります。昔の記事によく出てくる「Pages は帯域無制限」という説明は、現行のドキュメントにはもうその形では存在しません（古いFAQページは 404 になっています）。現在確認できる一次源は Workers の pricing ページで、そこにはこうあります。静的アセットへのリクエストは無料で無制限で、データ転送（egress）や帯域に対する追加課金はない。要するに成果物を置いて見せるぶんには、アクセス数で課金される仕組みではない、ということです。この表現も2026年11月18日更新のページ時点のものなので、使うときは自分でも確認してください。

## GitHub Pages との比較

よく聞かれるのがこちらです。GitHub Pages と比べてどうなのか。

GitHub Pages の現行の制限（公式ドキュメントより）は、公開サイトは 1 GB が推奨上限、帯域は月 100 GB のソフトリミット、ビルドは1時間に10回のソフトリミット（GitHub Actions のカスタムワークフローでのビルドはこの制限の対象外）です。

| 項目 | GitHub Pages（無料） | Cloudflare Pages（無料） |
|---|---|---|
| サイトの大きさ | 1 GB が推奨上限 | ファイル数 20,000 / 1ファイル 25 MiB |
| 帯域 | 月 100 GB のソフトリミット | 静的アセットのリクエストは無料・無制限（2026年11月時点のWorkers pricing） |
| ビルド | 1時間に10回のソフトリミット | 月 500 回 / 同時1 / 1回20分 |
| ホストの位置 | GitHub のアカウントとセット | Cloudflare アカウント単独で使える |

雑に要約すると、写真を大量に貼るサイトなら容量の伸びしやすい GitHub Pages より「ファイル数と単ファイルサイズで制限が来る」Cloudflare のほうが予測しやすいです。逆に、push するたびに自動デプロイされて余計なことを何も考えたくないなら、GitHub Pages の体験はいまだ強いです（この「push だけでいい」を Cloudflare でやる方法もあります。次で書きます）。

## デプロイの2つの方式

Cloudflare Pages へのデプロイには2通りあります。

**Git integration**。GitHub のリポジトリと Pages プロジェクトを接続して、push するたびに Cloudflare 側でビルドとデプロイが走る方式です。GitHub Pages に近い体験になります。ビルドコマンドと出力ディレクトリを指定するので、たとえば Quartz ならビルドコマンドに `npx quartz build`、出力に `public` を指定することになります。

**Direct Upload**。ビルドを手元でやって、成果物をアップロードする方式です。CLI からは

```text
npx wrangler login
npx wrangler pages project create <PROJECT_NAME>
npx wrangler pages deploy <BUILD_OUTPUT_DIRECTORY>
```

で完結します（公式の Direct Upload ガイドより）。プロジェクトの URL は `<PROJECT_NAME>.pages.dev` になります。ダッシュボードへのドラッグ&ドロップでもできますが、こちらは1回1,000ファイルまで（wrangler 経由なら20,000ファイルまで）という制限があります。

1つだけ重要な注意があります。**Direct Upload で始めたプロジェクトを、後から Git integration に切り替えることはできません**（公式ドキュメントに明記されています）。逆方向、つまり Git integration のプロジェクトに wrangler で手動デプロイするのは可能です。将来の選択肢を残すなら Git integration のほうが柔軟です。

## Riebeckite で Cloudflare に公開する場合

最後に、私のツールの話もしておきます（宣伝ではなく、設定の実装に関係するので）。

Riebeckite の `npx create-riebeckite` のスキャフォールドでデプロイ先に Cloudflare を選ぶと、デフォルトでは **Workers のほう** に設定されます。これは前節で書いた公式の勧告に従ったものです。設定の中身は2種類あって、`provider: "cloudflare-workers"` なら `wrangler deploy`、`provider: "cloudflare-pages"` なら `wrangler pages deploy` が実行される作りです。

このブログ自体は Pages のほう（`provider: "cloudflare-pages"`）で動かしています。前述の通り静的サイトには Pages で十分なので迷わずそうしましたが、新規で何か作るなら Workers を初期値にした、というだけの話です。ビルド結果をどこに置くかという点ではどちらも同じで、無料で始めておいて、後から変えたくなったら設定を書き換えるだけで済みます。

## FAQ

### Obsidian のノートを Cloudflare に公開すると、月いくらかかりますか？

ノートを静的サイトとして公開する分には 0 円で始められます。Pages の無料枠はビルド月500回・ファイル数20,000・1ファイル25 MiBで、静的アセットへのリクエストに対する課金はありません（2026年11月時点のWorkers pricingページによる）。有料になるのは、週に何度もビルドを回す必要が出たときや Workers の他の機能を使うときです（Workers 有料は月$5から）。

### GitHub Pages と Cloudflare、どちらを使えばいいですか？

写真や添付ファイルが多くて帯域を気にするなら Cloudflare、push するだけの簡単さを取るなら GitHub Pages が付き合いやすいです。GitHub Pages は月100GBのソフトリミットと 1GB の推奨上限がありますが、Cloudflare 側の静的アセットのリクエストは無料・無制限です（2026年11月時点）。どちらも無料なので、試して合わなければ乗り換えるのが一番はやいと思います。

### Cloudflare Pages はもう終わった製品ですか？

終わっていませんが、Cloudflare の主軸は Workers に移っています。Pages の公式ドキュメント（2026年11月時点）は「新規プロジェクトは Workers から」を案内していますが、Pages 自身も引き続き動作してメンテナンスもされていて、Pages から Workers への公式の移行ガイドも用意されています。静的サイトを置く用途なら Pages は今も実用です。

### Riebeckite では Cloudflare での公開はどう設定しますか？

`npx create-riebeckite` でデプロイ先に Cloudflare を選ぶと、初期値は Workers（`provider: "cloudflare-workers"`）になります。設定で `provider: "cloudflare-pages"` に切り替えると `wrangler pages deploy` での Pages 公開になります。ビルド成果物はどちらも `dist/` です。

## まとめにかえて

無料公開の全容（Publish 以外のルートの比較）は別の記事にまとめてあります。

[/blog/obsidian-publish-alternatives/](/blog/obsidian-publish-alternatives/)

日本語圏で Cloudflare が紹介されないのは、単純に情報が回っていないからだと思っています。数字ベースで判断したい人のために、この記事がその穴を埋められたなら嬉しいです。
