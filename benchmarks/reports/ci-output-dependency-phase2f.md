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

実行環境: Windows x64、Node v24.11.1、Intel Core i7-14700KF、RAM 32,581 MB。各ケース1 sample。incremental後の`dist`をclean buildの`dist`とファイル集合・内容ハッシュで比較した。HTML、JSON（検索・sitemap・graphを含む）、assetを含む。`.riebeckite`はclean前に削除する状態メタデータであり、公開出力同値性の対象外とした。Output Cacheとinventoryは各buildの診断・cache hit/missおよびHonoxの状態破損回帰で別途確認した。

Starterの既存結果はすべてincrementalとcleanのbyte比較が一致した。

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

### Showcase 再現・修正

最初のcold buildは`Mermaid build rendering failed: Cannot find package 'puppeteer' imported from ...plugin-qr-code/dist/index.js`で失敗した。QR Code pluginがPuppeteerを要求しているわけではない。ShowcaseのMermaid build rendererがdynamic importのfallbackで`process.cwd()`からPuppeteerを解決する一方、benchmark runnerがrepo rootをcwdとして子buildを起動していたため、scaffold siteに作成済みのPuppeteer linkを見つけられなかった。

`benchmarks/preset-ssg/runner.mjs`は子buildのcwdをscaffold siteへ変更し、CI runnerと同じ任意Vite alias（Puppeteer、`lz-string`）を追加した。Puppeteer 25.11.0とheadless shellは既存lockfile・ローカルcacheで利用可能で、依存追加・lockfile変更はない。

### Showcase: incremental と clean の比較

| サイズ | シナリオ | incremental rendered / reused | Output Cache hit / miss | Clean一致 |
| --- | --- | ---: | ---: | --- |
| 100 | cold | 268 / 0 | 0 / 322 | true |
| 100 | no-change | 268 / 0 | 330 / 0 | true |
| 100 | body edit | 268 / 0 | 330 / 0 | true |
| 100 | link edit | 268 / 0 | 330 / 0 | true |
| 100 | add | 272 / 0 | 330 / 0 | true |
| 100 | delete | 266 / 0 | 330 / 0 | true |
| 100 | rename | 268 / 0 | 330 / 0 | true |
| 100 | public-to-draft | 266 / 0 | 330 / 0 | true |
| 100 | draft-to-public | 270 / 0 | 330 / 0 | true |
| 1000 | cold | 2016 / 0 | 0 / 2124 | true |
| 1000 | no-change | 2016 / 0 | 2132 / 0 | true |
| 1000 | body edit | 2016 / 0 | 2132 / 0 | true |
| 1000 | link edit | 2016 / 0 | 2132 / 0 | true |
| 1000 | add | 2020 / 0 | 2132 / 0 | true |
| 1000 | delete | 2014 / 0 | 2132 / 0 | true |
| 1000 | rename | 2016 / 0 | 2132 / 0 | true |
| 1000 | public-to-draft | 2014 / 0 | 2132 / 0 | true |
| 1000 | draft-to-public | 2018 / 0 | 2132 / 0 | true |

9 scenarioすべてで差分は0件だった。public-to-draftでは出力数が減り、draft-to-publicでは増えることをclean buildと一致する形で確認した。delete、renameも旧出力を残さない。これらの計測時点では、後述の状態ストア検証漏れによりShowcaseのno-changeも全出力を再描画していた。出力同値性の判定自体はその状態でも有効である。

### Phase 2F-V: Showcase no-change の状態再利用

`public-location`をPhase 2FでOutput Dependencyに追加した一方、`content_build_state_store`の永続状態検証器がこの型を受理していなかった。Breadcrumbsを含むShowcaseの`content-state.json`は保存後に`invalid-shape`として破棄され、次回buildは全Contentを新規追加と判定していた。その結果、fast pathの判定順で`content-or-output-changed`が先に返り、本来の`plugin-build-end`ブロック理由に到達しなかった。

検証器に`{ type: "public-location", pathname: string }`を追加し、保存済みOutput descriptorを読み戻す回帰テストを追加した。期待値は変更していない。修正後のShowcase no-changeは`plugin-build-end`で通常buildへフォールバックし、SSGは`0 rendered / 85 reused`となった。Mermaidの`unsafe`契約に該当する8 Contentだけは安全側に再処理し、残る28 Contentは再利用した。全出力を再描画していた不要な処理は解消し、`buildEnd`を持つPluginのためfast path自体は意図どおり使用しない。

同じrunnerでno-changeを再計測し、100件では`0 rendered / 322 reused`、1000件では`0 rendered / 2124 reused`となった。いずれもclean buildとの差分は0件である。runnerの計測経路ではno-change fast pathも適用され、Contentはそれぞれ`8 processed / 128 reused`、`8 processed / 1028 reused`だった。

### Phase 2E との数値比較

同じマシンで記録されたPhase 2EのShowcase/1000 cold build（2 samples中央値）は175,592.5 ms、clean buildは151,703 msだった。今回の1 sampleはそれぞれ47,437 ms、43,641 msで、記録値との差は-73.0%、-71.2%である。ただしsample数が異なり、今回benchmark harnessのcwd解決も修正している。したがってこの差をPhase 2Fの依存粒度変更による性能改善とは解釈しない。Phase 2Fが直接変更したBreadcrumbs/Hover Previewの効果は、global依存が残るShowcase全体のrender数から分離して測定できない。

## 検証

- `pnpm --filter @riebeckite/core test` — 310 passed。動的dependencyの前回target併合、遷移保存後の旧target非保持、resolver failureの伝播、および`public-location`を含む状態の再読込を確認した。
- `pnpm --filter @riebeckite/plugin-breadcrumbs test` — 30 passed。
- `pnpm --filter @riebeckite/plugin-mermaid test` — 16 passed。
- `pnpm --filter @riebeckite/plugin-qr-code test` — 18 passed。
- `pnpm --filter @riebeckite/honox test` — 165 passed。output cache破損、delete、rename、public-to-draft、draft-to-publicを含む。
- `pnpm test:benchmark:presets` — 11 passed。runnerのclean比較とresumeを含む。
- `pnpm --filter @riebeckite/plugin-hover-preview build` — passed（packageにtest scriptはない）。
- `pnpm typecheck` — 146 projects OK。
- `pnpm check:docs` — 766 Markdown、plugin 70、theme README 12でpassed。
- `pnpm check:scaffold` — passed。
- `pnpm exec biome check benchmarks/preset-ssg/runner.mjs benchmarks/preset-ssg/runner.test.mjs packages/core/src/content/content_build_state_store.ts packages/core/test/content_build_state_store.test.ts packages/core/test/output_dependency.test.ts` — passed。
- `pnpm check` — 今回と無関係のwarning 13件、および既存`benchmarks/preset-ssg/ci-runner.mjs`のformat errorにより失敗。
- `RIEBECKITE_PRESET_FAST_PATH_PRESETS=showcase pnpm test:e2e:preset-fast-path` — passed。no-change、plugin option no-change、full build後のrecoveryはいずれも`plugin-build-end`、SSGは`0 rendered / 85 reused`。追加、編集、公開状態遷移、削除、renameおよびfull buildとのbyte一致もpassed。
- `pnpm test:e2e:preset-fast-path` — Empty、Minimal、Starter、Showcaseすべてpassed。
- `pnpm benchmark:presets --presets showcase --sizes 100,1000 --scenarios no-change` — 100/1000ともclean buildとの差分0件、全Output再利用を確認した。

## 次段階

1. Propertiesのfrontmatter wikilink/aliasを、前回descriptorを含めてentry単位に解決・追跡する。
2. Related Postsの候補集合とランキング入力を依存として表現し、追加・削除・公開状態遷移を検証する。
3. Responsive Imageにfile family dependencyを導入し、variantの追加・削除を検証する。
4. CanvasとDataviewはquery/埋め込み入力を表現できる設計を先に確定し、表現不能なqueryは`global`または`unknown`を維持する。
5. `puppeteer`が利用可能な環境でShowcase 100/1000の全scenarioを再実行し、前後比較を同条件で記録する。
