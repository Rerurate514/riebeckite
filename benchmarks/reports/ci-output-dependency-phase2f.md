# Phase 2F: Output Dependency Granularity

## 結論

Phase 2Fでは、Content Output全体に加算される`global`依存を、実際の入力を表せる範囲で狭域化した。今回の対象はHover PreviewとBreadcrumbsである。`global`を機械的に削除せず、全体集合を出力する生成fileや、入力を十分に表現できないPluginは残した。

Starterの標準構成には`properties`、`related-posts`、`responsive-image`などのContent Output向け`global`が残る。そのため今回の変更だけでは標準構成の全体再描画を解消しない。これは安全上の意図した結果であり、未追跡入力を持つ出力を再利用しない。

## 実装

- `resolveContentOutputDependencies({ entry, manifest })`をPlugin APIに追加した。静的な`contentOutputDependencies`と合成し、各Content Outputにだけ必要な依存を付与する。
- `public-location { pathname }`を追加した。この依存は正規公開pathのroutable Content ownerが変更、出現、消滅した場合に影響ありとする。
- 現在の出力に加え、同じpath・kindを持つ前回出力の依存も評価する。削除、公開解除、動的依存の消失で古い依存を落とさないためである。
- Breadcrumbsは各中間正規pathについて、Content ownerには`public-location`、Folder Pagesの生成locationには対応する`folder`を宣言する。
- Hover PreviewはContent HTMLに固定URLのpayloadを付加するだけであるため、Content Output向け`global`を削除した。全previewを含む`hover-preview.json`の`global`依存は維持した。

## global Output Dependency 監査

| 対象 | 判定 | 理由 |
| --- | --- | --- |
| Archive、Bases、Citations、Excalidraw、Garden Explorer、Series | 維持 | ページが公開集合または集合横断の集計を出力する。 |
| Canvas | 維持 | Canvas source、埋め込み先、単独Canvas pageを安全に関連付ける追跡が未実装。 |
| Dataview、Query | 維持 | query ASTのFROM/WHERE/sort/group入力を安全に抽出していない。 |
| Docs、Kanban、Excalibrain | 維持 | manifest横断のHTML/graph入力の完全な範囲を未表現。 |
| Daily Notes | 維持 | source directoryが空のとき公開集合に依存する。通常のfolder依存は既存のまま。 |
| Properties | 維持 | frontmatter wikilink/aliasの旧・新解決先をentry単位で永続的に追跡する実装が未完。 |
| Related Posts | 維持 | tag、outgoing/incoming link、co-citation、順位候補の全入力を安全に表現する実装が未完。 |
| Responsive Image | 維持 | asset variantの追加・削除を含むfile family依存が未実装。 |
| Breadcrumbs | 狭域化 | 正規公開pathのowner、または生成folder locationだけを追跡する。 |
| Hover Preview Content HTML | 削除 | payload URLは固定で、各entryのHTML変更はそのentry自身の依存で十分。 |
| Hover Preview index | 維持 | `hover-preview.json`は全routable preview集合を出力する。 |
| Folder Pages | 既存のまま | pageごとのfolder、navigation、recent-posts projectionを宣言済み。 |
| Backlinks、Local Graph | 追加不要 | build時にmanifest entry HTMLを横断変更する`contentOutputDependencies`を宣言していない。 |
| l10n | 既存の追跡を維持 | Phase 2EのMarkdown link依存追跡を利用する。 |
| Search、Sitemap、Feed | 全体データ出力として扱う | discoverable/routable集合を出力するendpointであり、Content Output向けのglobal宣言ではない。 |
| Deploy runtime generated output | 維持 | deployment入力を集約する生成outputである。 |

## 安全性

- `public-location`は前回と現在のroutable ownerを比較する。ownerの削除、draft化、scheduled化、公開化、置換を検出する。
- owner自身のContent変更およびprocessed-content fingerprint更新も追跡する。
- 前回の動的依存を現在のdescriptorと併合して評価するため、dependencyが現在のmanifestから消えても過少無効化しない。
- `unknown`、external dependency failure、既存のOutput Cache拒否条件は変更していない。`fullRegenerationRequired`の安全側動作も維持する。
- Core testで、無関係更新を再利用すること、owner更新、public-to-draftを確認した。Breadcrumbs testで正規path dependencyの宣言とdraft owner非露出を確認した。

## 計測

実行環境: Windows x64、Node v24.11.1、Intel Core i7-14700KF、RAM 32,581 MB。各ケース1 sample。増減比較用のPhase 2F直前計測はこのworktreeでは取得していないため、差分値は記載しない。

実行済みのStarter結果はすべてincrementalとcleanのbyte比較が一致した。

| サイズ | シナリオ | rendered | reused | Clean一致 |
| --- | --- | ---: | ---: | --- |
| 100 | cold | 212 | 0 | true |
| 100 | no-change | 0 | 256 | true |
| 100 | body edit | 212 | 10 | true |
| 100 | link edit | 212 | 10 | true |
| 100 | add | 122 | 128 | true |
| 100 | delete | 210 | 10 | true |
| 100 | rename | 119 | 124 | true |
| 100 | public-to-draft | 210 | 10 | true |
| 100 | draft-to-public | 214 | 10 | true |
| 1000 | cold | 1942 | 0 | true |
| 1000 | no-change | 0 | 2040 | true |
| 1000 | body edit | 1942 | 10 | true |
| 1000 | link edit | 1942 | 10 | true |
| 1000 | add | 1005 | 1029 | true |
| 1000 | delete | 1940 | 10 | true |
| 1000 | rename | 1002 | 1025 | true |
| 1000 | public-to-draft | 1940 | 10 | true |
| 1000 | draft-to-public | 1944 | 10 | true |

Showcase 100/1000は開始時のcold buildで未導入の`puppeteer`を`@riebeckite/plugin-qr-code`のMermaid build renderingが要求し、完走できなかった。依存追加やlockfile変更は本Phaseの範囲外のため行っていない。したがってShowcaseの数値は未検証であり、推測値を記載しない。

Starterのbody/link/delete/publication系がなお広くrenderされるのは、上表の監査で維持した`global`依存が標準presetに残るためである。`no-change`の0 renderとOutput Cache再利用は維持された。

## 検証

- `pnpm --filter @riebeckite/core test` — 307 passed
- `pnpm --filter @riebeckite/plugin-breadcrumbs test` — 30 passed
- `pnpm typecheck` — 146 projects OK
- `pnpm check` — 既存のwarning 13件と既存`benchmarks/preset-ssg/ci-runner.mjs`のformat errorにより失敗。今回の変更に関するerrorはformat修正済み。

## 次段階

1. Propertiesのfrontmatter wikilink/aliasを、前回descriptorを含めてentry単位に解決・追跡する。
2. Related Postsの候補集合とランキング入力を依存として表現し、追加・削除・公開状態遷移を検証する。
3. Responsive Imageにfile family dependencyを導入し、variantの追加・削除を検証する。
4. CanvasとDataviewはquery/埋め込み入力を表現できる設計を先に確定し、表現不能なqueryは`global`または`unknown`を維持する。
5. `puppeteer`が利用可能な環境でShowcase 100/1000の全scenarioを再実行し、前後比較を同条件で記録する。
