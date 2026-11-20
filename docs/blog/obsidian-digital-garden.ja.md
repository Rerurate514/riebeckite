---
title: Obsidian でデジタルガーデンを作って公開する方法
description: デジタルガーデンは発表日順に並べるブログではなく、育て続けるノートの集まり。この記事ではその考え方（Maggie Appleton の定義と変遷）、Obsidian のノートがガーデンに向いている理由、ツールごとの選択的公開の違い、それから公開後の手入れの仕方をまとめる。
date: 2026-11-21
category: Tutorials
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - tutorial
  - digital-garden
---

デジタルガーデンとは、発表日を軸にしない公開ノートの集まりです。ブログのように新しい投稿を上に積むのではなく、ノート同士をリンクでつないで、少しずつ手を入れて育てていく。Maggie Appleton の [A Brief History & Ethos of the Digital Garden](https://maggieappleton.com/garden-history) が定義としてよく引用されていて、そこにはこうあります。ガーデンは「発表日で厳密に並べ替えられていない、進化し続けるアイデアの集まり」で、ノートは文脈のつながりでリンクされる、と。

Obsidian を使っている人なら、この説明で「あ、これは自分の vault のことだ」となったと思います。バックリンクとグラフと wikilink で文脈ごとにノートをつないでいる時点で、非公開のガーデンはもう動いている。残る作業は「どのノートを、どのツールで、どこまで公開するか」だけです。

最初に開示しておくと、このブログは私が開発しているフレームワーク Riebeckite 上で動いていて、下のツールのリストにも登場します。並び順はセットアップの手間が少ない順であって、推奨順ではありません。

## ガーデンという考え方の背景

短く歴史を押さえておきます。用語の初出記録は Mark Bernstein の [Hypertext Gardens](http://www.eastgate.com/garden/Enter.html)（1998年）。考え方の源流としては Mike Caufield の2015年の講演「The Garden and the Stream: a Technopastoral」が挙げられていて、Appleton も「デジタルガーデニングの源流は Caufield と考えるべき」と書いています。その後、Tom Critchlow の2018年の記事と Joel Hooks の2019年の「My blog is a digital garden, not a blog」あたりで輪が広がりました。c2 wiki の WikiGardeners と WikiGnomes みたいな「庭の手入れ役」という呼び名が90年代からあった、という話も Appleton の記事にあります。

Appleton が挙げるガーデンの特徴は6つで、「タイムラインより地形（Topography over Timelines）」「継続的な成長」「未完成のまま学びを公開する」「遊び心と個人的な実験」「内容の多様さの混植」「独立した所有権」です。大事なのは1つ目と2つ目だと思っています。発表日で並べないことと、完成を待たないこと。この2つがブログとの違いです。

もうひとつ、Appleton は成長段階のラベルも提案しています（原文では絵文字付きです）。Seedling（書きかけ）、Budding（育ちつつある）、Evergreen（ほぼ完成、ただし手入れは続ける）。各ノートに planted（植えた日）と last tended（最後に手を入れた日）を付ける運用です。

## なぜ Obsidian がガーデンに向いているか

この聞き方は逆で、ガーデンに向いたノートの置き場所として Obsidian が成立している、ということかなと思います。理由は3つ。

1. **リンクが文脈で張れる。**フォルダではなく wikilink とバックリンクで構造ができる。ガーデンの「地形」はこっちの構造です。
2. **ノートを書き替えるのが前提のツール群。**日次ノートと常時編集の文化がある。
3. **公開が後から決められる。**vault を作ってから「これとこれは公開しよう」という順番でも苦がない。

つまり vault の中はすでにガーデンで、問題は公開の設計だけです。

## ツールごとの「選択的公開」の違い

ガーデンの公開で一番設計が要るのは、公開するノートとしないノートの分け方です。ツールごとに仕組みが違うので、そこで整理します（各ツールの詳細な比較は[Obsidian Publish の代替ツール比較](/blog/obsidian-publish-alternatives/)に書きました）。

- **[Obsidian Publish](https://obsidian.md/publish)**：アプリ上のトグルで公開・非公開を切り替えられます。有料（月8〜10ドル）。
- **[Digital Garden プラグイン](https://github.com/oleeskild/obsidian-digital-garden)**：ノートの frontmatter に `dg-publish: true` を付けたものだけを公開します。ガーデン用途では一番自然な方式。公開リポジトリに履歴が残る点だけ注意。
- **[Flowershow](https://flowershow.app/)**：Obsidian プラグインで公開するノートを選んで、Flowershow 側のホスティングに載せます。無料は flowershow.me のサブドメインとクレジット制で、独自ドメインなどは月5ドルからの有料プランです。
- **[Quartz](https://quartz.jzhao.xyz/)**：vault（またはその一部）をリポジトリに入れて公開します。非公開ノートは vault から分けるか、ignore 設定で除外。
- **[Perlite](https://github.com/secure-77/Perlite)**：vault をまるごと web ディレクトリに置いて配信する方式で、README も「全部公開」が前提と明記しています。ガーデン向けというより、全公開の全文検索ビューア向けかなと。
- **Riebeckite**（私のツールです）：frontmatter に `private: true` か `draft: true` を付けたもの以外を公開する方式で、digital-garden プリセットを用意してあります。

公開リポジトリの git 履歴に非公開ノートが残る問題は、どのツールでも共通の注意点です。詳細は[代替ツール比較の該当セクション](/blog/obsidian-publish-alternatives/)に書いたので省きます。

## 公開されているガーデンの実例

日本語圏で有名な公開ガーデンの例として、西尾泰和さんの [mem.nhiro.org](https://mem.nhiro.org/) を挙げておきます。Scrapbox 系のカスタムビューとして動いていて、このブログで扱う「Obsidian vault をビルドして静的公開する」系のツールとは仕組みが別物ですが、「文脈のリンクでノートがつながる公開知識」というガーデンの実例としては十分参照になると思います。

![西尾泰和さんの mem.nhiro.org](/assets/blog/digital-garden-nishio.png)
*[mem.nhiro.org](https://mem.nhiro.org/)（2026年11月時点のスクリーンショット）。*

## 公開までの手順（最小構成）

ツールを決めたら、あとは[Obsidian のノートを無料で Web 公開する方法](/blog/publish-obsidian-notes-for-free/)の手順がそのまま使えます。ガーデン向けに最小構成を書くとこうです。

1. 公開用のリポジトリ（またはフォルダ）を作る。
2. ツールをセットアップする（Digital Garden プラグイン、Quartz、Riebeckite など）。
3. 最初は3〜5ノートだけ選んで公開する。
4. ホストは GitHub Pages か Cloudflare に置く。無料枠で十分です。

最初から全部は公開しない、というのがガーデンの流儀に合った作法だと思っています。Seedling を数個外に出して、反応や自分の興味に合わせて育てる。

## 手入れの運用

公開してからがガーデンの本番です。私がやっている（またはおすすめできる）運用は次の3つ。

- **成長段階のラベルを frontmatter に書く。**Appleton 流の Seedling / Budding / Evergreen をタグにする。タグから一覧ページが生えるツールなら（Riebeckite の taxonomy、Quartz のタグページなど）、成長段階ごとの見取り図が自動でできます。
- **last tended を記録する。**日にちを frontmatter に持たせておくと、「何ヶ月も更新していない Evergreen」が見える化されます。
- **公開ノートと非公開ノートの行き来を前提にする。**非公開にしたノートの URL がどうなるか（404 になるか、リダイレクトされるか）を最初に確認しておくと、後で慌てません。

## どのツールで始めるか

私の分け方は単純で、**公開したいノートがハッキリ決まっているなら Digital Garden プラグイン、vault 全体の見取り図ごと公開したいなら Quartz、ホスティング側に任せたいなら Flowershow か Publish、公開側を自分のコードとして持ちたければ Riebeckite** です。Riebeckite については[Quartz と Riebeckite の違い](/blog/quartz-vs-riebeckite/)に詳しく書きました。

どれでもいいのでとりあえず3ノート出す。ガーデンは最初の植え付けより手入れの継続で決まるので、続けられそうなツールを選ぶのが正解だと思います。

## よくある質問

### デジタルガーデンとは何ですか

発表日順に並べない、育て続ける公開ノートの集まりです。Maggie Appleton の定義では「発表日で厳密に並べ替えられていない、進化し続けるアイデアの集まり」で、ノード同士は文脈のつながりでリンクされます。ブログとの違いは、更新を恥とせずノートを書き替え続ける点です。

### Obsidian のノートをガーデンとして公開するには何が要りますか

公開用のツールと無料のホストがあれば足ります。ツールは Digital Garden プラグイン、Quartz、Flowershow、Riebeckite など（選択的公開の仕組みはこの記事のリストのとおり）。ホストは GitHub Pages か Cloudflare の無料枠で十分です。手順は[Obsidian のノートを無料で Web 公開する方法](/blog/publish-obsidian-notes-for-free/)にまとめてあります。

### 非公開のノートはどうやって除外しますか

ツールごとに仕組みが違います。Digital Garden プラグインは逆方向で、`dg-publish: true` を付けたノートだけが公開されます。Quartz は公開リポジトリに入れたものが出るので、非公開ノートは vault から分けます。Flowershow はプラグインで選んだノートが公開されます。Riebeckite は `private: true` か `draft: true` を付けたノートを公開対象から除外します。公開リポジトリの git 履歴には残るので、履歴ごと非公開にする必要があるノートは最初から公開側に入れないでください。

### 手入れはどのくらいの頻度で必要ですか

決まりはなくて、「書き替えたいと思ったときに書き替える」が基本です。Appleton 式に planted と last tended を付けておけば、放置しているノートが見えるようになります。Seedling を Evergreen に育てるタイミングに正解はないので、自分が気になったときの記録として残すのが続けやすいと思います。
